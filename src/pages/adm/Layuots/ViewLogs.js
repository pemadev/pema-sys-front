import PropTypes from "prop-types";
import React, { useEffect } from "react";
import { Badge } from "reactstrap";
import dayjs from "dayjs";
import 'dayjs/locale/id';
import Loader from '../../../layouts/loader/Loader';
import './Logs.scss';

const ViewLogs = ({type, data , func1}) => {
    dayjs.locale('id');
    useEffect(() => {
        console.log(data);
    }, [data])

    return (
        <>
            {data?.length>0 ?
                (<>
                    <div className="px-4">
                        <ul className="timeline ">
                            {data?.map((item, i) => (
                                <li key={type==='sm'?item.employe_id:item.id}>
                                    <h5
                                        style={{ marginBottom: '-1px' }}
                                        className='fw-bold'
                                    >
                                        {type==='sm'?item.nama:item.first_name}
                                    </h5>
                                    <Badge
                                        className="text-dark"
                                        color="light"
                                        style={{ paddingLeft: '2px', paddingRight: '2px' }}
                                    >
                                        {type==='sm'?item.position:item.position_name}
                                    </Badge>
                                    {/* khusus untuk surat masuk */}
                                    {i!==0 && type==='sm' && item.dispo ? <Badge
                                        className="text-light ms-2 px-3"
                                        color="dark"
                                        style={{ cursor: 'pointer' }}
                                        onClick={()=>func1(item)}
                                    >
                                        Lembar Disposisi
                                    </Badge>:''}
                                    <span className="float-end small fw-lighter">{dayjs(type==='sm'?item.waktu:item.created_at).locale('id').format('dddd, DD MMMM YYYY HH:mm')}</span>
                                    <p className='mt-2 small' >
                                        {item.activity}<br/><span className="fst-italic">{item?.cc?.length>0&& `CC : ${item?.cc?.join(', ')}`}</span>
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>)
                : <Loader />}
        </>
    );
};

ViewLogs.propTypes = {
    data: PropTypes.array,
    type: PropTypes.string, 
    func1: PropTypes.func
};

export default ViewLogs;