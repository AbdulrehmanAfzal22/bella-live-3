function Wave({bottom=false}){
  return <div className={`why-bella__wave${bottom?' why-bella__wave--bottom':''}`} aria-hidden="true">{[0,1].map(layer=><svg className={`why-bella__wave-layer why-bella__wave-layer--${layer}`} key={layer} viewBox="0 0 1440 90" preserveAspectRatio="none"><path d="M0 42C120 6 240 78 360 42C480 6 600 78 720 42C840 6 960 78 1080 42C1200 6 1320 78 1440 42V90H0Z"/></svg>)}</div>;
}
export default function WhyChooseBella(){
  return <section className="why-bella" aria-labelledby="why-bella-title">
    <Wave/>
    <div className="why-bella__copy"><h2 id="why-bella-title">Why Choose Bellabyrt?</h2><p>Get the perfect finishing touch for every look with glossy lips, flattering shades, and effortless application. Bellabyrt helps you feel confident, look polished, and express your personal style every day.</p><p className="why-bella__signature">Bellabyrt — Your Beauty, Your Statement.</p></div>
    <Wave bottom/>
  </section>;
}
