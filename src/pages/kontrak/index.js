import Dashboard from "./DashboardTemp";
import HalamanPro from "../../components/HalamanPro";


const index = () => {
    return (

        <HalamanPro judul="Kontrak" keterangan="Ringkasan dan riwayat kontrak">
            <Dashboard />
        </HalamanPro>
    );
};

export default index;
