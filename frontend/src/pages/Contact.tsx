import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function Contact() {
  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main">
        <section className="contact-route-hero" aria-labelledby="contact-heading">
          <div className="container">
            <p className="contact-route-eyebrow">Contact Cuckoo Safaris</p>
            <h1 id="contact-heading">Let’s plan your next journey</h1>
            <p>Tell us what you hope to see and our Victoria Falls team will help you plan your safari.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Contact
