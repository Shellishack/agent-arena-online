export default function HomePage() {
  return (
    <main className="home">
      <section className="homePanel">
        <p className="eyebrow">Agent Arena Online</p>
        <h1>Open a session monitor</h1>
        <form action="/play" className="joinForm">
          <input name="session" placeholder="Session ID" required />
          <button type="submit">Open Monitor</button>
        </form>
      </section>
    </main>
  );
}
