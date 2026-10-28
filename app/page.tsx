import Link from "next/link";

const phones = [
  { name: "Halo X1", price: "from $599", blurb: "6.4\" 120 Hz OLED, 50 MP camera, two-day battery." },
  { name: "Halo X1 Pro", price: "from $799", blurb: "Titanium frame, periscope zoom, 512 GB option." },
  { name: "Halo Lite", price: "from $349", blurb: "The essentials, with the same 24-month warranty." },
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div>
          <h1>Phones built to last two days.</h1>
          <p>Compare specs, check warranty terms or fix a charging problem. Ask the Halo assistant, which answers from our official documents.</p>
          <Link href="/assistant" className="btn">Ask the assistant</Link>
        </div>
        <div className="phone" aria-hidden />
      </section>
      <section className="grid">
        {phones.map((p) => (
          <article className="card" key={p.name}>
            <h3>{p.name}</h3>
            <div className="price">{p.price}</div>
            <p>{p.blurb}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
