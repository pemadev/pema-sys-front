import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Box, MenuItem, TextField, ListSubheader, Button } from "@mui/material";
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import { alert } from "../../../components/atoms/Toast";
import useAxios from "../../../hooks/useAxios";




const animatedComponents = makeAnimated();
const Disposisi = ({ data, refresh, closeModal }) => {
    const [to, setTo] = useState(null);

    const [direksi, setDireksi] = useState([]);
    const [managerEks, setManagerEks] = useState([]);
    const [division, setDivision] = useState([]);
    const [ccs, setCcs] = useState([]);

    const [cc, setCC] = useState([]);

    const [ccs1, setCcs1] = useState([]);

    const [catatan, setCatatan] = useState('');

    const [selectedTickler, setSelectedTickler] = useState([]);
    const [tickler, setTickler] = useState([]);

    const [idSurat, setIdSurat]=useState('');
    const [loading, setLoading] = useState(false);

    const ticklers=[
        {
            value:'Diwakilkan',
            label:'Diwakilkan'
        },
        {
            value:'Diproses',
            label:'Diproses / Dilaksanakan'
        },
        {
            value:'Ditindaklanjuti',
            label:'Ditindaklanjuti'
        },
        {
            value:'Dipelajari',
            label:'Dipelajari'
        },
        {
            value:'Dihadiri',
            label:'Dihadiri'
        },
        {
            value:'Dimonitor',
            label:'Dimonitor'
        },
        {
            value:'Diarsip',
            label:'Diarsip / Difile'
        }
    ]

    const api = useAxios();
    useEffect(() => {
        api.get(`dapi/adm/dispo/to`).then((res) => {

            setDireksi(res.data.data?.disposisi?.direksi);
            setManagerEks(res.data.data?.disposisi?.manager_eks);
            setDivision(res.data.data?.disposisi?.divisions);
            setCcs(res.data.data?.cc);
            setCcs1(res.data.data?.cc);
        });
        setIdSurat(data?.id_surat);
    }, [data]);

    const changeAssign = (choice) => {
        setCC(choice);
    };

    const changeTickler = (choice) => {
        setSelectedTickler(choice);
        setTickler((prevTickler) => [
            ...prevTickler,
            ...choice.map((p) => p.value),
        ]);

    };

    useEffect(() => {
        console.log(tickler);
    }, [tickler]);

    useEffect(() => {
        setCC(cc?.filter((p) => p?.employe_id !== to?.employe_id))
        setCcs1(ccs?.filter((p) => p?.employe_id !== to?.employe_id));
    }, [to]);

    const submit =async () => {
        setLoading(true);
        await api.post(`dapi/adm/suratmasuk/diposisi/${idSurat}`, {
           catatan,tickler,to , what:'dispo', cc
        }).then((res) => {
            setLoading(false);
            if (res.status === 200) {
                refresh();
                closeModal();
                alert('success', 'Disposisi Berhasil !');
            }
        }).catch((err) => {
            console.log(err);
        });
    }


    return (
        <>
            <span className="small fst-italic">Perihal {data?.perihal}</span>
            <hr />

            <Box className="mb-3">
                <TextField
                    select
                    style={{ width: '100%' }}
                    variant="outlined"
                    value={to || ''}
                    onChange={(e) => setTo(e.target.value)}
                    label="Disposisi Kepada"
                >
                    {to === null && <MenuItem value={null} className="fst-italic small">Silakan Pilih Tujuan Disposisi . . . . </MenuItem>}
                    <ListSubheader style={{ backgroundColor: '#f5f5f5' }}><strong>DIREKTUR TERKAIT</strong></ListSubheader>
                    {direksi?.map((item) => (
                        <MenuItem className="ms-2" key={item?.employe_id} value={item}>
                            {item.position_name}
                        </MenuItem>
                    ))}
                    <ListSubheader style={{ backgroundColor: '#f5f5f5' }}><strong>MANAGER EKSEKUTIF</strong></ListSubheader>
                    {managerEks?.map((item) => (
                        <MenuItem className="ms-2" key={item?.employe_id} value={item}>
                            {item.position_name}
                        </MenuItem>
                    ))}
                    <ListSubheader style={{ backgroundColor: '#f5f5f5' }}><strong>DIVISI TERKAIT</strong></ListSubheader>
                    {division?.map((item) => (
                        <MenuItem className="ms-2" key={item?.employe_id} value={item}>
                            {item.position_name}
                        </MenuItem>
                    ))}



                </TextField>
            </Box>

            <Box className="mb-3">
                <Select
                    placeholder="Tickler Disposisi"
                    components={animatedComponents}
                    isMulti
                    styles={{
                        control: (provided) => ({
                            ...provided,
                            minHeight: '55px',
                        }),
                        menu: (base) => ({
                            ...base,
                            background: '#f0f0f0', // Background list
                            borderRadius: 4,
                            zIndex: 10, // Agar dropdown berada di atas elemen lain
                        }),
                    }}
                    value={selectedTickler}
                    options={ticklers}
                    onChange={changeTickler}
                    isClearable={tickler.some((v) => !v.isFixed)}
                />
            </Box>

            <Box className="mb-3">
                <Select
                    placeholder="Carbon Copy (CC)"
                    components={animatedComponents}
                    isMulti
                    styles={{
                        control: (provided) => ({
                            ...provided,
                            minHeight: '55px',
                        }),
                        menu: (base) => ({
                            ...base,
                            background: '#f0f0f0', // Background list
                            borderRadius: 4,
                            zIndex: 10, // Agar dropdown berada di atas elemen lain
                        }),
                    }}
                    value={cc}
                    options={ccs1}
                    onChange={changeAssign}
                    isClearable={cc.some((v) => !v.isFixed)}
                />
            </Box>

            <Box className="mb-3"> <TextField
                style={{ width: '100%' }}
                id="outlined-multiline-static"
                placeholder="Lorem ipsum dolor sit amet,
lorem ipsum dolo
Lorem ipsum,"
                label="Catatan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                multiline
                rows={4}
            />
            </Box>


            <Box className="mb-3 mt-4">
                <Button
                    variant="contained"
                    color="primary"
                    style={{ width: '100%' }}
                    onClick={submit}
                    disabled={loading}
                >
                   {loading? 'Loading . . .': 'Disposisi'}
                </Button>
            </Box>

        </>
    );

};

Disposisi.propTypes = {
    data: PropTypes.object,
    refresh: PropTypes.func,
    closeModal: PropTypes.func
};

export default Disposisi;