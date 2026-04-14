import Hero from '../sections/Hero'
import Countdown from '../sections/Countdown'
import Prizes from '../sections/Prizes'
import About from '../sections/About'
import Details from '../sections/Details'
import Domains from '../sections/Domains'
import WhyJoin from '../sections/WhyJoin'
import Timeline from '../sections/Timeline'
import Judging from '../sections/Judging'
import Sponsors from '../sections/Sponsors'
import Contact from '../sections/Contact'
import Footer from '../sections/Footer'

export default function Home() {
  return (
    <main>
      <Hero />
      <Countdown />
      <Prizes />
      <About />
      <Details />
      <Domains />
      <WhyJoin />
      <Timeline />
      <Judging />
      <Sponsors />
      <Contact />
      <Footer />
    </main>
  )
}
