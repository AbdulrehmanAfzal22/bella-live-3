export const glossTraits=[{label:'Glossy',emoji:'🍒'},{label:'Scented',emoji:'🍪'},{label:'lightweight',emoji:'🫧'},{label:'plumping',emoji:'🎀'}];
export default function GlossTraits(){
  return <span className="gloss-traits">{glossTraits.map((trait,index)=><span className="gloss-traits__part" key={trait.label}>{index>0&&<span className="gloss-traits__dot" aria-hidden="true">•</span>}{trait.label} <span className="gloss-traits__emoji" aria-hidden="true">{trait.emoji}</span></span>)}</span>;
}
