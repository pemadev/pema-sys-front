import BreadCrumbs from "../../layouts/breadcrumbs/BreadCrumbs";
import Dashboard from "./DashboardTemp";
import HalamanPro from "../../components/HalamanPro";


const index = () => {
    return (

        <HalamanPro>
            <BreadCrumbs />
            <Dashboard />
        </HalamanPro>
    );
};

export default index;
