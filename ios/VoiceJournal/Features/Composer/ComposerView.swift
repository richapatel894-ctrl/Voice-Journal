import SwiftUI
import PhotosUI
import UniformTypeIdentifiers

/// One composer for both capture (kind: .voice/.text, existing: nil) and
/// edit (existing: the entry being changed). Matches the requirements doc:
/// no mood picker at capture time — theme/emotion only become editable once
/// an entry exists and you're correcting it (git history: "Remove home mood
/// picker; auto-detect emotion; edit/delete on Today feed").
struct ComposerView: View {
    var kind: EntryKind = .text
    var existing: Entry?
    var onSaved: (Entry) -> Void

    @Environment(\.dismiss) private var dismiss
    @StateObject private var audioRecorder = AudioRecorder()

    @State private var text: String = ""
    @State private var theme: String = "Uncategorized"
    @State private var emotion: String?

    @State private var isSaving = false
    @State private var isTranscribing = false
    @State private var errorMessage: String?

    @State private var photoSelections: [PhotosPickerItem] = []
    @State private var pendingPhotos: [PendingAttachment] = []
    @State private var pendingFiles: [PendingAttachment] = []
    @State private var pendingLinks: [String] = []
    @State private var newLinkText: String = ""
    @State private var showFileImporter = false

    private var isEditing: Bool { existing != nil }
    private var hasContentToSave: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            || !pendingPhotos.isEmpty || !pendingFiles.isEmpty || !pendingLinks.isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                if kind == .voice && !isEditing {
                    recordingSection
                }

                Section(kind == .voice && !isEditing ? "Transcript" : "Entry") {
                    TextEditor(text: $text)
                        .frame(minHeight: 120)
                }

                if isEditing {
                    Section("Categorize") {
                        Picker("Theme", selection: $theme) {
                            ForEach(ThemeCatalog.all, id: \.self) { Text($0).tag($0) }
                        }
                        Picker("Emotion", selection: $emotion) {
                            Text("— none —").tag(String?.none)
                            ForEach(EmotionCatalog.all, id: \.self) { e in
                                Text("\(EmotionCatalog.emoji[e] ?? "") \(e)").tag(String?.some(e))
                            }
                        }
                    }
                }

                attachmentsSection

                if let errorMessage {
                    Section {
                        Text(errorMessage).foregroundStyle(.red).font(.footnote)
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Entry" : (kind == .voice ? "Record" : "Write"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        audioRecorder.cancel()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving {
                        ProgressView()
                    } else {
                        Button("Save") { Task { await save() } }
                            .disabled(!hasContentToSave)
                    }
                }
            }
            .onAppear(perform: setupExisting)
            .onChange(of: photoSelections) { _, newItems in
                Task { await loadPhotos(newItems) }
            }
            .fileImporter(
                isPresented: $showFileImporter,
                allowedContentTypes: [.item],
                allowsMultipleSelection: true
            ) { result in
                handleFileImport(result)
            }
        }
    }

    // MARK: - Sections

    private var recordingSection: some View {
        Section {
            VStack(spacing: 12) {
                Button {
                    Task { await toggleRecording() }
                } label: {
                    Image(systemName: audioRecorder.isRecording ? "stop.circle.fill" : "mic.circle.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(audioRecorder.isRecording ? .red : Color.journalPinkDark)
                }
                .buttonStyle(.plain)

                Text(formattedDuration(audioRecorder.duration))
                    .font(.title3.monospacedDigit())
                    .foregroundStyle(.secondary)

                if isTranscribing {
                    ProgressView("Transcribing…")
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
        }
    }

    private var attachmentsSection: some View {
        Section("Attachments") {
            if let existing {
                ForEach(existing.media, id: \.self) { raw in
                    Label(MediaItem.classify(raw).displayName, systemImage: "paperclip")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            ForEach(pendingPhotos) { item in
                Label(item.filename, systemImage: "photo")
            }
            ForEach(pendingFiles) { item in
                Label(item.filename, systemImage: "doc")
            }
            ForEach(pendingLinks, id: \.self) { link in
                Label(link, systemImage: "link")
            }

            PhotosPicker(selection: $photoSelections, matching: .images) {
                Label("Add photos", systemImage: "photo.on.rectangle")
            }
            Button {
                showFileImporter = true
            } label: {
                Label("Add files", systemImage: "doc.badge.plus")
            }
            HStack {
                TextField("Paste a link", text: $newLinkText)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
                Button("Add", action: addLink)
                    .disabled(!isValidLink(newLinkText))
            }
        }
    }

    // MARK: - Setup

    private func setupExisting() {
        guard let existing else { return }
        text = existing.text
        theme = existing.theme ?? "Uncategorized"
        emotion = existing.displayEmotion
    }

    // MARK: - Recording

    private func toggleRecording() async {
        if audioRecorder.isRecording {
            guard let url = audioRecorder.stop() else { return }
            await transcribe(url: url)
        } else {
            let granted = await audioRecorder.requestPermission()
            guard granted else {
                errorMessage = "Microphone access is off. Enable it in Settings to record."
                return
            }
            do {
                try audioRecorder.start()
            } catch {
                errorMessage = "Couldn't start recording: \(error.localizedDescription)"
            }
        }
    }

    private func transcribe(url: URL) async {
        isTranscribing = true
        defer { isTranscribing = false }
        do {
            let data = try Data(contentsOf: url)
            let transcript = try await APIClient.shared.transcribe(audioData: data, filename: url.lastPathComponent)
            if !transcript.isEmpty {
                text = text.isEmpty ? transcript : text + "\n" + transcript
            }
        } catch {
            errorMessage = "Transcription unavailable (\(error.localizedDescription)). You can type the entry instead."
        }
    }

    // MARK: - Attachments

    private func loadPhotos(_ items: [PhotosPickerItem]) async {
        for item in items {
            guard let data = try? await item.loadTransferable(type: Data.self) else { continue }
            let filename = "\(UUID().uuidString).jpg"
            pendingPhotos.append(PendingAttachment(filename: filename, data: data, mimeType: "image/jpeg"))
        }
        photoSelections = []
    }

    private func handleFileImport(_ result: Result<[URL], Error>) {
        guard case .success(let urls) = result else { return }
        for url in urls {
            let accessed = url.startAccessingSecurityScopedResource()
            defer { if accessed { url.stopAccessingSecurityScopedResource() } }
            guard let data = try? Data(contentsOf: url) else { continue }
            let mime = mimeType(for: url)
            pendingFiles.append(PendingAttachment(filename: url.lastPathComponent, data: data, mimeType: mime))
        }
    }

    private func isValidLink(_ candidate: String) -> Bool {
        let trimmed = candidate.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.lowercased().hasPrefix("http://") || trimmed.lowercased().hasPrefix("https://")
    }

    private func addLink() {
        let trimmed = newLinkText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard isValidLink(trimmed) else { return }
        pendingLinks.append(trimmed)
        newLinkText = ""
    }

    private func mimeType(for url: URL) -> String {
        if let type = UTType(filenameExtension: url.pathExtension), let mime = type.preferredMIMEType {
            return mime
        }
        return "application/octet-stream"
    }

    // MARK: - Save

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        do {
            var entry: Entry
            if let existing {
                entry = try await APIClient.shared.updateEntry(
                    id: existing.id, text: text, theme: theme, emotion: emotion ?? ""
                )
            } else {
                entry = try await APIClient.shared.createEntry(kind: kind, text: text)
            }

            var uploadedSomething = false
            for photo in pendingPhotos {
                _ = try await APIClient.shared.attachFile(
                    entryID: entry.id, data: photo.data, filename: photo.filename, mimeType: photo.mimeType
                )
                uploadedSomething = true
            }
            for file in pendingFiles {
                _ = try await APIClient.shared.attachFile(
                    entryID: entry.id, data: file.data, filename: file.filename, mimeType: file.mimeType
                )
                uploadedSomething = true
            }
            for link in pendingLinks {
                try await APIClient.shared.attachLink(entryID: entry.id, url: link)
                uploadedSomething = true
            }

            if uploadedSomething {
                entry = try await APIClient.shared.getEntry(id: entry.id)
            }

            onSaved(entry)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct PendingAttachment: Identifiable {
    let id = UUID()
    let filename: String
    let data: Data
    let mimeType: String
}
