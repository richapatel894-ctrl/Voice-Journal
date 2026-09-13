import Foundation

enum APIError: LocalizedError {
    case notConfigured
    case server(String)
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .notConfigured: return "Set your server address in Settings first."
        case .server(let message): return message
        case .invalidResponse: return "The server sent back something unexpected."
        }
    }
}

/// One async/await client for backend/server.js's whole API (TECH_DESIGN.md §3),
/// plus the link-attachment addition. Talks to whatever server URL + API key
/// are currently in SettingsStore — the Mac's backend on the local network.
@MainActor
final class APIClient {
    static let shared = APIClient()
    private init() {}

    private var settings: SettingsStore { SettingsStore.shared }

    private func makeRequest(
        _ path: String,
        method: String = "GET",
        body: Data? = nil,
        contentType: String? = "application/json"
    ) throws -> URLRequest {
        guard let base = settings.serverURL, let url = URL(string: path, relativeTo: base) else {
            throw APIError.notConfigured
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        if let contentType {
            request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        }
        let key = settings.apiKey
        if !key.isEmpty {
            request.setValue(key, forHTTPHeaderField: "X-API-Key")
        }
        request.httpBody = body
        return request
    }

    private func send(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            if let body = try? JSONDecoder().decode([String: String].self, from: data),
               let message = body["error"] {
                throw APIError.server(message)
            }
            throw APIError.server("Server error (\(http.statusCode))")
        }
        return data
    }

    // MARK: - Entries

    func createEntry(kind: EntryKind, text: String, emotion: String? = nil) async throws -> Entry {
        var body: [String: Any] = ["kind": kind.rawValue, "text": text]
        if let emotion { body["emotion"] = emotion }
        let data = try JSONSerialization.data(withJSONObject: body)
        let request = try makeRequest("/api/entries", method: "POST", body: data)
        return try JSONDecoder().decode(Entry.self, from: try await send(request))
    }

    func listEntries(theme: String? = nil, emotion: String? = nil) async throws -> [Entry] {
        var path = "/api/entries"
        var query: [String] = []
        if let theme { query.append("theme=\(theme.urlQueryEncoded)") }
        if let emotion { query.append("emotion=\(emotion.urlQueryEncoded)") }
        if !query.isEmpty { path += "?" + query.joined(separator: "&") }
        let request = try makeRequest(path)
        return try JSONDecoder().decode([Entry].self, from: try await send(request))
    }

    func getEntry(id: String) async throws -> Entry {
        let request = try makeRequest("/api/entries/\(id)")
        return try JSONDecoder().decode(Entry.self, from: try await send(request))
    }

    func updateEntry(
        id: String,
        text: String? = nil,
        theme: String? = nil,
        emotion: String? = nil,
        userConfirmed: Bool? = nil
    ) async throws -> Entry {
        var body: [String: Any] = [:]
        if let text { body["text"] = text }
        if let theme { body["theme"] = theme }
        if let emotion { body["emotion"] = emotion }
        if let userConfirmed { body["userConfirmed"] = userConfirmed }
        let data = try JSONSerialization.data(withJSONObject: body)
        let request = try makeRequest("/api/entries/\(id)", method: "PATCH", body: data)
        return try JSONDecoder().decode(Entry.self, from: try await send(request))
    }

    func deleteEntry(id: String) async throws {
        let request = try makeRequest("/api/entries/\(id)", method: "DELETE")
        _ = try await send(request)
    }

    // MARK: - Transcription

    func transcribe(audioData: Data, filename: String) async throws -> String {
        let body = MultipartBody(fieldName: "audio", filename: filename, mimeType: "audio/m4a", data: audioData)
        let request = try makeRequest(
            "/api/transcribe", method: "POST", body: body.data,
            contentType: "multipart/form-data; boundary=\(body.boundary)"
        )
        struct Response: Decodable { let transcript: String }
        return try JSONDecoder().decode(Response.self, from: try await send(request)).transcript
    }

    // MARK: - Media

    func attachFile(entryID: String, data fileData: Data, filename: String, mimeType: String) async throws -> String {
        let body = MultipartBody(fieldName: "file", filename: filename, mimeType: mimeType, data: fileData)
        let request = try makeRequest(
            "/api/entries/\(entryID)/media", method: "POST", body: body.data,
            contentType: "multipart/form-data; boundary=\(body.boundary)"
        )
        struct Response: Decodable { let filename: String }
        return try JSONDecoder().decode(Response.self, from: try await send(request)).filename
    }

    func attachLink(entryID: String, url: String) async throws {
        let data = try JSONSerialization.data(withJSONObject: ["url": url])
        let request = try makeRequest("/api/entries/\(entryID)/media", method: "POST", body: data)
        _ = try await send(request)
    }

    func fetchMediaData(filename: String) async throws -> Data {
        let request = try makeRequest("/api/media/\(filename.urlQueryEncoded)", contentType: nil)
        return try await send(request)
    }

    // MARK: - Stats & health

    func emotionStats() async throws -> [EmotionStat] {
        let request = try makeRequest("/api/stats/emotions")
        return try JSONDecoder().decode([EmotionStat].self, from: try await send(request))
    }

    struct Health: Decodable {
        let status: String
        let whisper: Bool
        let llm: Bool
    }

    func health() async throws -> Health {
        let request = try makeRequest("/api/health")
        return try JSONDecoder().decode(Health.self, from: try await send(request))
    }
}

private struct MultipartBody {
    let boundary = "Boundary-\(UUID().uuidString)"
    let data: Data

    init(fieldName: String, filename: String, mimeType: String, data fileData: Data) {
        var body = Data()
        body.append("--\(boundary)\r\n".utf8Data)
        body.append("Content-Disposition: form-data; name=\"\(fieldName)\"; filename=\"\(filename)\"\r\n".utf8Data)
        body.append("Content-Type: \(mimeType)\r\n\r\n".utf8Data)
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".utf8Data)
        self.data = body
    }
}

private extension String {
    var utf8Data: Data { Data(utf8) }
    var urlQueryEncoded: String {
        addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? self
    }
}
