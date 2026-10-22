import {useProducts} from '../hooks/useProducts';
import LuxuryHero from '../components/LuxuryHero';
import BrandStatement from '../components/BrandStatement';
import CollectionShowcase from '../components/CollectionShowcase';
import NewArrivals from '../components/NewArrivals';
import HomeProducts from '../components/HomeProducts';
import CategoryCarousel from '../components/CategoryCarousel';
import StorySection from '../components/StorySection';
import WhyChooseBella from '../components/WhyChooseBella';
import LoveGallery from '../components/LoveGallery';

export default function Home(){
	const q=useProducts();

	return <>
		<LuxuryHero/>
		<WhyChooseBella/>
		<CollectionShowcase products={q.data||[]} loading={q.loading&&!q.data} error={q.error} retry={q.refresh}/>
		<NewArrivals products={q.data||[]} loading={q.loading&&!q.data} error={q.error} retry={q.refresh}/>
		<BrandStatement/>
		{/* Accessories — uncomment when this section is needed.
        <CategoryCarousel products={q.data||[]}/>
        */}
		{/* Find Your Style / Find Your Glow — uncomment when needed.
        <StorySection products={q.data||[]}/>
        */}
        <HomeProducts products={q.data||[]} loading={q.loading&&!q.data} error={q.error} retry={q.refresh}/>
		<LoveGallery/>
	</>;
}
