// Displays public information about the application.
export function About() {
    return <section className="about-page">
        <span className="eyebrow">A LITTLE ABOUT US</span>
        <h1>Good journeys<br />start with curiosity.</h1>
        <p>Vacationly is a place to discover destinations, explore vacation ideas and keep the places you love close at hand.</p>
        <p>Developed by <strong>henvizman</strong> as a Full Stack project using React, TypeScript, Node.js and MySQL.</p>
        <div className="about-grid"><article><span>01 / DISCOVER</span><h2>Find your kind of escape.</h2><p>Browse the collection, from city breaks to quiet coastlines.</p></article>
        <article><span>02 / SAVE</span><h2>Follow what moves you.</h2><p>Save your favorite vacations and come back when inspiration calls.</p></article></div>
    </section>;
}
