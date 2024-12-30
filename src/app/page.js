// app/page.js
import styles from './home.module.scss';
import Banner from '../components/Banner/Banner';
import NavBar from '../components/NavBar/NavBar';

export default function Home() {
    return (
        <>
            <NavBar/>
            <main>
                <Banner/>
            </main>

        </>

    );
}
