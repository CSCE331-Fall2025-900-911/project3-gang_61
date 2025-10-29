import styles from "./page.module.css";

function Hero() {
  return (
    <>
      <h1>CSCE 331 Project 3 Gang 61</h1>
      <p>This is the homepage for our bubble tea store GUI</p>
      <p>Work in progress</p>
    </>
  );
}

function CTAButtons() {
  return (
    <div className={styles.ctas}>
      <a className={styles.primary} href="#menu">View Menu</a>
      <a className={styles.secondary} href="#contact">Contact Us</a>
    </div>
  );
}

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <Hero />
        </div>
        <CTAButtons />
      </main>
    </div>
  );
}
