import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function Home() {
  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="main">
        <section className="section">
          <div className="w-layout-blockcontainer container w-container">
            <h1>Cuckoo Safaris</h1>
            <p>Victoria Falls Safari Specialists</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Home
