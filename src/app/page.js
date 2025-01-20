// app/page.js
import styles from './home.module.scss';
import Banner from '../components/Banner/Banner';
import NavBar from '../components/NavBar/NavBar';
import CarrouselProject from "../components/CarousselProject/CarrouselProject";

export default function Home() {
    return (
        <>
            <NavBar/>
            <main>
                <Banner/>
            </main>
            <div style={{ width: "100vw", height: "100vh", overflowX: "hidden" }}>
                <CarrouselProject/>
            </div>

        </>

    );
}
