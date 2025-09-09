import { useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import { generateClient } from "@aws-amplify/backend";
import awsExports from "./amplify_outputs.json";
import "./App.css";

Amplify.configure(awsExports);
const client = generateClient();

function App() {
  const [notes, setNotes] = useState([]);
  const [noteData, setNoteData] = useState({ name: "", description: "", image: null });
  const [loading, setLoading] = useState(true);

  async function fetchNotes() {
    setLoading(true);
    try {
      const list = await client.Note.list();
      const notesWithUrls = await Promise.all(
        list.items.map(async (note) => {
          if (note.image) {
            const url = await client.storage.getURL(note.image);
            return { ...note, imageUrl: url };
          }
          return note;
        })
      );
      setNotes(notesWithUrls);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createNote() {
    try {
      let imageKey = null;
      if (noteData.image) {
        imageKey = `media/${noteData.image.name}`;
        await client.storage.put(imageKey, noteData.image);
      }
      await client.Note.create({
        name: noteData.name,
        description: noteData.description,
        image: imageKey,
      });
      setNoteData({ name: "", description: "", image: null });
      fetchNotes();
    } catch (error) {
      console.error("Error creating note:", error);
    }
  }

  async function deleteNote(id) {
    try {
      await client.Note.delete(id);
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="App">
          <h1>Welcome, {user.username}</h1>
          <button onClick={signOut}>Sign Out</button>

          <div className="card">
            <input
              placeholder="Note name"
              value={noteData.name}
              onChange={(e) => setNoteData({ ...noteData, name: e.target.value })}
            />
            <input
              placeholder="Description"
              value={noteData.description}
              onChange={(e) => setNoteData({ ...noteData, description: e.target.value })}
            />
            <input type="file" onChange={(e) => setNoteData({ ...noteData, image: e.target.files[0] })} />
            <button onClick={createNote}>Create Note</button>
          </div>

          {loading ? (
            <p>Loading notes...</p>
          ) : (
            <div className="notes-container">
              {notes.map((note) => (
                <div key={note.id} className="card">
                  <h3>{note.name}</h3>
                  <p>{note.description}</p>
                  {note.imageUrl && <img src={note.imageUrl} alt={note.name} style={{ maxWidth: "200px" }} />}
                  <button onClick={() => deleteNote(note.id)}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Authenticator>
  );
}

export default App;
