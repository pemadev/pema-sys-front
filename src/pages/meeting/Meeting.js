import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardText,
  CardTitle,
  Col,
  Form,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Row,
} from 'reactstrap';
import * as pdfMake from 'pdfmake/build/pdfmake';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';
import useAxios from '../../hooks/useAxios';
import { AuthContext } from '../../context/AuthContext';

const pdfFonts = require('../../assets/vfs_fonts');

if (pdfFonts && pdfFonts.pdfMake) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
  pdfMake.fonts = {
    Archivo: {
      normal: 'Archivo-Regular.ttf',
      bold: 'Archivo-SemiBold.ttf',
      italics: 'Archivo-Italic.ttf',
      bolditalics: 'Archivo-SemiBoldItalic.ttf',
    },
  };
}



const roomColors = {
  Growth: 'primary',
  Harmoni: 'success',
  Kopiah: 'warning',
  Internasional: 'info',
};

const roomIcons = {
  Growth: '📈',
  Harmoni: '🎵',
  Kopiah: '🧢',
  Internasional: '🌍',
};

const SCHEDULE_FILTER = {
  UPCOMING: 'upcoming',
  PREVIOUS: 'previous',
};

const parseApiDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue) return null;

  const withSeparator = new Date(normalizedValue.replace(' ', 'T'));
  if (!Number.isNaN(withSeparator.getTime())) {
    return withSeparator;
  }

  const directValue = new Date(normalizedValue);
  return Number.isNaN(directValue.getTime()) ? null : directValue;
};

const formatZoomDateTime = (value) => {
  if (!value) return '-';

  const date = parseApiDateValue(value);
  if (!date) {
    return value;
  }

  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const getZoomValue = (item, keys) => {
  const value = keys
    .map((key) => item?.[key])
    .find((keyValue) => keyValue !== undefined && keyValue !== null && keyValue !== '');

  return value ?? '';
};

const getCreatorName = (item) => {
  const creatorValue = getZoomValue(item, ['created_by_name', 'created_by', 'creator_name', 'user_name', 'name']);

  if (typeof creatorValue === 'object' && creatorValue !== null) {
    return creatorValue.name || creatorValue.full_name || creatorValue.username || '';
  }

  return creatorValue || '';
};

const getCreatorId = (item) => {
  const creatorId = getZoomValue(item, ['created_by_id', 'created_by', 'creator_id', 'user_id', 'employe_id', 'employee_id', 'created_by_employe_id', 'created_by_employee_id']);

  if (typeof creatorId === 'object' && creatorId !== null) {
    return creatorId.id || creatorId.employe_id || creatorId.employee_id || creatorId.user_id || '';
  }

  return creatorId || '';
};

const getZoomSources = (item, includeRoot = true) => {
  const nestedSources = [
    item?.zoom,
    item?.zoom_details,
    item?.zoom_meeting,
    item?.zoomMeeting,
    item?.zoomDetails,
    item?.zoom_detail,
    item?.zoomDetail,
    item?.zoom_data,
    item?.zoomData,
    item?.meeting_zoom,
    item?.meetingZoom,
    item?.zoom_info,
    item?.zoomInfo,
  ].filter((source) => typeof source === 'object' && source !== null);

  return includeRoot ? [item, ...nestedSources] : nestedSources;
};

const getZoomDataValue = (item, keys, includeRoot = true) => {
  const sources = getZoomSources(item, includeRoot);
  const value = sources
    .map((source) => keys.map((key) => source?.[key]).find((candidate) => candidate !== undefined && candidate !== null && candidate !== ''))
    .find((candidate) => candidate !== undefined && candidate !== null && candidate !== '');

  return value ?? '';
};

const getBooleanLabel = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    if (fallback === true) return 'Ya';
    if (fallback === false) return 'Tidak';
    return '-';
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'ya', 'yes', 'y'].includes(normalized)) {
    return 'Ya';
  }
  if (['0', 'false', 'tidak', 'no', 'n'].includes(normalized)) {
    return 'Tidak';
  }

  if (fallback === true) return 'Ya';
  if (fallback === false) return 'Tidak';
  return '-';
};

const getZoomMeetingId = (item) => {
  const nestedId = getZoomDataValue(item, ['meeting_id', 'zoom_id', 'id'], false);
  if (nestedId) return nestedId;
  return getZoomDataValue(item, ['meeting_id', 'zoom_id', 'zoom_meeting_id', 'zoomMeetingId'], true);
};

const getApiErrorMessage = (error, fallbackMessage) => {
  return error?.apiMessage || error?.response?.data?.message || error?.message || fallbackMessage;
};

const isTruthyValue = (value) => {
  if (value === undefined || value === null || value === '') return false;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'ya', 'yes', 'y'].includes(normalized);
};

const ensureApiSuccess = (response, fallbackMessage) => {
  if (response?.data?.success === false) {
    const message = response?.data?.message || fallbackMessage;
    const apiError = new Error(message);
    apiError.apiMessage = message;
    throw apiError;
  }

  return response;
};

const formatMeetingDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-CA');
};

const formatMeetingTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const loadImageAsDataUrl = async (imagePath) => {
  try {
    const response = await fetch(imagePath);
    if (!response.ok) {
      return '';
    }

    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return '';
  }
};

const Meeting = () => {
  const api = useAxios();
  const { auth } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('meeting');
  const [scheduleFilter, setScheduleFilter] = useState(SCHEDULE_FILTER.UPCOMING);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [meetingFormData, setMeetingFormData] = useState({
    topic: '',
    participants: '',
    startTime: '',
    endTime: '',
    zoom: '',
    consumption: '',
    consumption_detail: '',
    room: 'Growth',
  });
  const [zoomFormData, setZoomFormData] = useState({
    topic: '',
    startTime: '',
    endTime: '',
  });
  const [zoomMeetings, setZoomMeetings] = useState([]);
  const [loadingZoomMeetings, setLoadingZoomMeetings] = useState(false);
  const [submittingZoom, setSubmittingZoom] = useState(false);
  const [cancelingZoomId, setCancelingZoomId] = useState(null);
  const [zoomError, setZoomError] = useState('');
  const [zoomSuccess, setZoomSuccess] = useState('');
  const [roomMeetings, setRoomMeetings] = useState([]);
  const [loadingRoomMeetings, setLoadingRoomMeetings] = useState(false);
  const [submittingRoom, setSubmittingRoom] = useState(false);
  const [cancelingRoomId, setCancelingRoomId] = useState(null);
  const [roomError, setRoomError] = useState('');
  const [roomSuccess, setRoomSuccess] = useState('');
  const [expandedRoomIds, setExpandedRoomIds] = useState([]);
  const [isRoomDetailModalOpen, setIsRoomDetailModalOpen] = useState(false);
  const [selectedRoomDetail, setSelectedRoomDetail] = useState(null);
  const [isZoomDetailModalOpen, setIsZoomDetailModalOpen] = useState(false);
  const [selectedZoomDetail, setSelectedZoomDetail] = useState(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [generalDivisionApprover, setGeneralDivisionApprover] = useState('PUK Divisi Umum');

  const currentUserId = auth?.user?.employe_id || auth?.user?.employee_id || auth?.user?.id || auth?.user?.user_id || '';
  const currentUserName = auth?.user?.first_name || auth?.user?.name || auth?.user?.full_name || auth?.user?.username || '';

  const canCancelZoom = (item) => {
    const creatorId = getCreatorId(item);
    const creatorName = getCreatorName(item);

    if (currentUserId) {
      return String(creatorId) === String(currentUserId);
    }

    if (currentUserName && creatorName) {
      return String(creatorName).toLowerCase() === String(currentUserName).toLowerCase();
    }

    return false;
  };

  const handleMeetingChange = (e) => {
    const { name, value } = e.target;
    setMeetingFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleZoomChange = (e) => {
    const { name, value } = e.target;
    setZoomFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchRoomMeetings = async () => {
    setLoadingRoomMeetings(true);
    setRoomError('');
    try {
      const response = await api.get('dapi/meeting/room/list');
      const data = response?.data?.data ?? response?.data ?? [];
      setRoomMeetings(Array.isArray(data) ? data : []);
    } catch (error) {
      setRoomMeetings([]);
      setRoomError(error?.response?.data?.message || 'Gagal memuat daftar booking ruang.');
    } finally {
      setLoadingRoomMeetings(false);
    }
  };

  const fetchZoomMeetings = async () => {
    setLoadingZoomMeetings(true);
    setZoomError('');
    try {
      const response = await api.get('dapi/meeting/zoom/list');
      const data = response?.data?.data ?? response?.data ?? [];
      setZoomMeetings(Array.isArray(data) ? data : []);
    } catch (error) {
      setZoomMeetings([]);
      setZoomError(error?.response?.data?.message || 'Gagal memuat daftar zoom meeting.');
    } finally {
      setLoadingZoomMeetings(false);
    }
  };

  const fetchGeneralDivisionApprover = async () => {
    try {
      const response = await api.get('dapi/adm/signers/20');
      const signers = response?.data?.data ?? [];

      if (!Array.isArray(signers) || signers.length === 0) {
        return;
      }

      const signer = signers.find((item) => String(item?.organization_id) === '20') || signers[0];
      const firstName = signer?.first_name || signer?.name || signer?.full_name || '';
      const position = signer?.position || signer?.job_position || signer?.jabatan || '';

      if (!firstName && !position) {
        return;
      }

      const signerLabel = [firstName, position].filter(Boolean).join(' - ');
      setGeneralDivisionApprover(signerLabel || 'PUK Divisi Umum');
    } catch (error) {
      // Keep fallback approver when endpoint is unavailable.
    }
  };

  const isIncomingSchedule = (item) => {
    const startValue = getZoomValue(item, ['start_time', 'startTime', 'start_at', 'start']);
    const endValue = getZoomValue(item, ['end_time', 'endTime', 'end_at', 'end']);
    const startDate = parseApiDateValue(startValue);
    const endDate = parseApiDateValue(endValue);

    const isSameCalendarDay = (leftDate, rightDate) => (
      leftDate
      && rightDate
      && leftDate.getFullYear() === rightDate.getFullYear()
      && leftDate.getMonth() === rightDate.getMonth()
      && leftDate.getDate() === rightDate.getDate()
    );

    if (startDate && endDate) {
      const startsToday = isSameCalendarDay(startDate, currentTime);
      const isStillRunning = startDate <= currentTime && currentTime <= endDate;
      return startsToday || isStillRunning;
    }

    if (startDate) {
      return isSameCalendarDay(startDate, currentTime) || currentTime >= startDate;
    }

    if (endDate) {
      return currentTime <= endDate;
    }

    return true;
  };

  const filterByScheduleGroup = (items) => {
    return items.filter((item) => {
      const incoming = isIncomingSchedule(item);
      if (scheduleFilter === SCHEDULE_FILTER.PREVIOUS) {
        return !incoming;
      }
      return incoming;
    });
  };

  const filteredRoomMeetings = useMemo(() => {
    return filterByScheduleGroup(roomMeetings, (item) => item.start_time || item.startTime || item.start_at || item.start);
  }, [roomMeetings, scheduleFilter, currentTime]);

  const filteredZoomMeetings = useMemo(() => {
    return filterByScheduleGroup(zoomMeetings, (item) => getZoomValue(item, ['start_time', 'startTime', 'start_at', 'start']));
  }, [zoomMeetings, scheduleFilter, currentTime]);

  const getMeetingStatusMeta = (startValue, endValue) => {
    const nowTime = currentTime.getTime();
    const startDate = new Date(startValue);
    const endDate = new Date(endValue);
    const hasStart = !Number.isNaN(startDate.getTime());
    const hasEnd = !Number.isNaN(endDate.getTime());

    if (hasStart && hasEnd) {
      if (nowTime < startDate.getTime()) {
        return { label: 'Scheduled', color: 'primary', textClassName: 'text-white' };
      }
      if (startDate.getTime() <= nowTime && nowTime <= endDate.getTime()) {
        return { label: 'Live', color: 'success', textClassName: 'text-white' };
      }
      if (nowTime > endDate.getTime()) {
        return { label: 'Finished', color: 'secondary', textClassName: 'text-white' };
      }
    }

    if (hasStart && nowTime >= startDate.getTime()) {
      return { label: 'Live', color: 'success', textClassName: 'text-white' };
    }

    return { label: 'Scheduled', color: 'primary', textClassName: 'text-white' };
  };

  const getRoomMeetingStatusMeta = (item) => {
    return getMeetingStatusMeta(
      item?.start_time || item?.startTime || item?.start_at || item?.start,
      item?.end_time || item?.endTime || item?.end_at || item?.end,
    );
  };

  const getZoomMeetingStatusMeta = (item) => {
    return getMeetingStatusMeta(
      getZoomValue(item, ['start_time', 'startTime', 'start_at', 'start']),
      getZoomValue(item, ['end_time', 'endTime', 'end_at', 'end']),
    );
  };



  const handleMeetingSubmit = (e) => {
    e.preventDefault();
    const submit = async () => {
      setRoomError('');
      setRoomSuccess('');
      setSubmittingRoom(true);
      try {
        const response = await api.post('dapi/meeting/room/book', {
          topic: meetingFormData.topic,
          participants: meetingFormData.participants,
          start_time: meetingFormData.startTime,
          end_time: meetingFormData.endTime,
          startTime: meetingFormData.startTime,
          endTime: meetingFormData.endTime,
          zoom: meetingFormData.zoom,
          consumption: meetingFormData.consumption,
          consumption_detail: meetingFormData.consumption_detail,
          consumptionDetail: meetingFormData.consumption_detail,
          room: meetingFormData.room,
        });
        ensureApiSuccess(response, 'Gagal membuat booking ruang rapat.');

        setIsMeetingModalOpen(false);
        setMeetingFormData({
          topic: '',
          participants: '',
          startTime: '',
          endTime: '',
          zoom: '',
          consumption: '',
          consumption_detail: '',
          room: 'Growth',
        });
        setRoomSuccess('Booking ruang rapat berhasil.');
        await fetchRoomMeetings();
        await fetchZoomMeetings();
      } catch (error) {
        setRoomError(getApiErrorMessage(error, 'Gagal membuat booking ruang rapat.'));
      } finally {
        setSubmittingRoom(false);
      }
    };

    submit();
  };



  const handleCancelRoom = async (id) => {
    if (!id) return;
    setRoomError('');
    setRoomSuccess('');
    setCancelingRoomId(id);
    try {
      await api.post(`dapi/meeting/room/cancel/${id}`);
      setRoomSuccess('Booking ruang rapat berhasil dibatalkan.');
      await fetchRoomMeetings();
      await fetchZoomMeetings();
    } catch (error) {
      setRoomError(error?.response?.data?.message || 'Gagal membatalkan booking ruang.');
    } finally {
      setCancelingRoomId(null);
    }
  };

  const toggleExpandedRoom = (id) => {
    setExpandedRoomIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openRoomDetailModal = (item) => {
    setSelectedRoomDetail(item);
    setCopyMessage('');
    setIsRoomDetailModalOpen(true);
  };

  const closeRoomDetailModal = () => {
    setIsRoomDetailModalOpen(false);
    setSelectedRoomDetail(null);
    setCopyMessage('');
  };

  const openZoomDetailModal = (item) => {
    setSelectedZoomDetail(item);
    setCopyMessage('');
    setIsZoomDetailModalOpen(true);
  };

  const closeZoomDetailModal = () => {
    setIsZoomDetailModalOpen(false);
    setSelectedZoomDetail(null);
    setCopyMessage('');
  };

  const handleCopyText = async (value, label) => {
    if (!value) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(value));
        setCopyMessage(`${label} berhasil disalin.`);
      }
    } catch (error) {
      setCopyMessage(`Gagal menyalin ${label}.`);
    }
  };

  const handleDownloadConsumptionDoc = async (item) => {
    const topic = getZoomValue(item, ['topic', 'title', 'name']) || '-';
    const creatorName = getCreatorName(item) || '-';
    const participantCount = getZoomValue(item, ['participants', 'jumlah_peserta']) || '-';
    const startRaw = getZoomValue(item, ['start_time', 'startTime', 'start_at', 'start']);
    const endRaw = getZoomValue(item, ['end_time', 'endTime', 'end_at', 'end']);
    const roomName = getZoomValue(item, ['room', 'ruangan', 'location']) || '-';
    const consumptionDetail = getZoomValue(item, ['consumption_detail', 'consumptionDetail', 'konsumsi_detail', 'konsumsi']) || 'Konsumsi rapat';
    const division = getZoomValue(item, ['division', 'divisi', 'department', 'dept']) || '-';
    const approver = getZoomValue(item, ['approved_by_name', 'approver_name', 'approval_name', 'disetujui_oleh']) || generalDivisionApprover || 'PUK Divisi Umum';
    const letterheadImage = await loadImageAsDataUrl(`${process.env.PUBLIC_URL || ''}/Letterhead_Potrait_Parsial1.png`);

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [36, 28, 36, 28],
      defaultStyle: {
        font: 'Archivo',
        fontSize: 11,
      },
      content: [
        ...(letterheadImage ? [{ image: letterheadImage, width: 520, alignment: 'center', margin: [0, 0, 0, 14] }] : []),
        {
          text: 'Form Permintaan konsumsi',
          bold: true,
          fontSize: 22,
          alignment: 'center',
          margin: [0, 10, 0, 20],
        },
        {
          table: {
            widths: [120, '*'],
            body: [
              ['Nama Pemohon', creatorName],
              ['Tgl Rapat', formatMeetingDate(startRaw)],
              ['Jam', `${formatMeetingTime(startRaw)} - ${formatMeetingTime(endRaw)}`],
              ['Ruang', `Ruang ${roomName}`],
              ['Agenda', topic],
              ['Jumlah Anggota Rapat', String(participantCount)],
              ['Konsumsi', consumptionDetail],
              ['Divisi', division],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 18],
        },
        {
          table: {
            widths: ['*'],
            body: [[
              {
                stack: [
                  { text: 'Perlu Untuk Diingat :', bold: true, margin: [0, 0, 0, 4] },
                  { text: 'Setiap permintaan konsumsi rapat/kegiatan wajib di sertai foto dokumentasi. Biaya permintaan yang tidak dilengkapi foto menjadi tanggung jawab pemohon.' },
                ],
                margin: [8, 8, 8, 8],
              },
            ]],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#4b5563',
            vLineColor: () => '#4b5563',
          },
          margin: [0, 0, 0, 36],
        },
        {
          columns: [
            { text: 'Catatan Pemohon', italics: true, color: '#374151' },
            { text: '', alignment: 'right' },
          ],
          margin: [0, 0, 0, 26],
        },
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Pemohon,', alignment: 'center' },
                { text: '\n\n\n' },
                { text: creatorName, alignment: 'center', decoration: 'underline' },
              ],
            },
            {
              width: '*',
              stack: [
                { text: 'Disetujui oleh,', alignment: 'center' },
                { text: '\n\n\n' },
                { text: approver, alignment: 'center', decoration: 'underline' },
              ],
            },
          ],
        },
      ],
    };

    const safeTopic = String(topic).replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'Konsumsi';
    pdfMake.createPdf(docDefinition).download(`Bukti_Booking_Konsumsi_${safeTopic}.pdf`);
  };

  const handleZoomSubmit = async (e) => {
    e.preventDefault();
    setZoomError('');
    setZoomSuccess('');
    setSubmittingZoom(true);

    try {
      const response = await api.post('dapi/meeting/zoom/book', {
        topic: zoomFormData.topic,
        start_time: zoomFormData.startTime,
        startTime: zoomFormData.startTime,
        end_time: zoomFormData.endTime,
        endTime: zoomFormData.endTime,
      });
      ensureApiSuccess(response, 'Gagal membuat booking zoom meeting.');

      setIsZoomModalOpen(false);
      setZoomFormData({
        topic: '',
        startTime: '',
        endTime: '',
      });
      setZoomSuccess('Zoom meeting berhasil dibooking.');
      await fetchZoomMeetings();
    } catch (error) {
      setZoomError(getApiErrorMessage(error, 'Gagal membuat booking zoom meeting.'));
    } finally {
      setSubmittingZoom(false);
    }
  };

  const handleCancelZoom = async (id) => {
    if (!id) {
      return;
    }

    setZoomError('');
    setZoomSuccess('');
    setCancelingZoomId(id);

    try {
      await api.post(`dapi/meeting/zoom/cancel/${id}`);
      setZoomSuccess('Zoom meeting berhasil dibatalkan.');
      await fetchZoomMeetings();
    } catch (error) {
      setZoomError(error?.response?.data?.message || 'Gagal membatalkan zoom meeting.');
    } finally {
      setCancelingZoomId(null);
    }
  };

  useEffect(() => {
    fetchZoomMeetings();
    fetchRoomMeetings();
    fetchGeneralDivisionApprover();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <BreadCrumbs />

      <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '16px' }}>
        <CardBody>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <CardTitle tag="h4" className="mb-1">
                Daftar Rapat
              </CardTitle>
              <CardText className="text-muted mb-0">
                Organisasi rapat berdasarkan ruangan dan agenda yang sedang berjalan.
              </CardText>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button color="success" onClick={() => setIsZoomModalOpen(true)}>
                + Booking Zoom
              </Button>
              <Button color="primary" onClick={() => setIsMeetingModalOpen(true)}>
                + Booking Rapat
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Row className="g-3 mb-4">
        {['Growth', 'Harmoni', 'Kopiah', 'Internasional'].map((room) => {
          const total = roomMeetings.filter((item) => (item.room || item.ruangan || item.location) === room).length || 0;
          return (
            <Col md="3" key={room}>
              <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '14px', background: 'linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%)' }}>
                <CardBody>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', backgroundColor: '#e9f2ff', fontSize: '20px' }}>
                        {roomIcons[room]}
                      </div>
                      <div>
                        <h6 className="mb-1">{room}</h6>
                        <small className="text-muted">Ruangan</small>
                      </div>
                    </div>
                    <span
                      className="rounded-pill px-2 py-1"
                      style={{
                        background: '#eaf2ff',
                        color: '#2563eb',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {total} rapat
                    </span>
                  </div>
                </CardBody>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Modal isOpen={isMeetingModalOpen} toggle={() => setIsMeetingModalOpen(!isMeetingModalOpen)} centered>
        <ModalHeader toggle={() => setIsMeetingModalOpen(!isMeetingModalOpen)}>Booking Rapat</ModalHeader>
        <ModalBody>
          <Form onSubmit={handleMeetingSubmit}>
            {roomError ? <Alert color="danger">{roomError}</Alert> : null}
            {roomSuccess ? <Alert color="success">{roomSuccess}</Alert> : null}
            <FormGroup>
              <Label for="meetingTopic">Topic Rapat</Label>
              <Input id="meetingTopic" name="topic" value={meetingFormData.topic} onChange={handleMeetingChange} placeholder="Contoh: Review Project" required />
            </FormGroup>

            <FormGroup>
              <Label for="participants">Jumlah Peserta</Label>
              <Input id="participants" name="participants" type="number" min="1" value={meetingFormData.participants} onChange={handleMeetingChange} placeholder="Contoh: 10" required />
            </FormGroup>

            <Row>
              <Col md="6">
                <FormGroup>
                  <Label for="meetingStartTime">Waktu Mulai</Label>
                  <Input id="meetingStartTime" name="startTime" type="datetime-local" value={meetingFormData.startTime} onChange={handleMeetingChange} required />
                </FormGroup>
              </Col>
              <Col md="6">
                <FormGroup>
                  <Label for="meetingEndTime">Waktu Berakhir</Label>
                  <Input id="meetingEndTime" name="endTime" type="datetime-local" value={meetingFormData.endTime} onChange={handleMeetingChange} required />
                </FormGroup>
              </Col>
            </Row>

            <FormGroup>
              <Label for="zoom">Butuh Link Zoom</Label>
              <Input id="zoom" name="zoom" type="select" value={meetingFormData.zoom} onChange={handleMeetingChange}>
                <option value="">Pilih</option>
                <option value="1">Ya</option>
                <option value="0">Tidak</option>
              </Input>
            </FormGroup>

            <FormGroup>
              <Label for="consumption">Butuh Konsumsi</Label>
              <Input id="consumption" name="consumption" type="select" value={meetingFormData.consumption} onChange={handleMeetingChange}>
                <option value="">Pilih</option>
                <option value="1">Ya</option>
                <option value="0">Tidak</option>
              </Input>
            </FormGroup>

            {meetingFormData.consumption === '1' ? (
              <FormGroup>
                <Label for="consumption_detail">Detail Konsumsi</Label>
                <Input
                  id="consumption_detail"
                  name="consumption_detail"
                  type="textarea"
                  rows="3"
                  value={meetingFormData.consumption_detail}
                  onChange={handleMeetingChange}
                  placeholder="Contoh: Snack 20 pax, kopi/teh, makan siang"
                />
              </FormGroup>
            ) : null}

            <FormGroup>
              <Label for="room">Ruangan</Label>
              <Input id="room" name="room" type="select" value={meetingFormData.room} onChange={handleMeetingChange}>
                <option value="Growth">Growth</option>
                <option value="Harmoni">Harmoni</option>
                <option value="Kopiah">Kopiah</option>
                <option value="Internasional">Internasional</option>
              </Input>
            </FormGroup>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button color="secondary" type="button" onClick={() => setIsMeetingModalOpen(false)}>
                Batal
              </Button>
              <Button color="primary" type="submit" disabled={submittingRoom}>
                {submittingRoom ? 'Menyimpan...' : 'Simpan Booking'}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      <Modal isOpen={isZoomModalOpen} toggle={() => setIsZoomModalOpen(!isZoomModalOpen)} centered>
        <ModalHeader toggle={() => setIsZoomModalOpen(!isZoomModalOpen)}>Booking Zoom</ModalHeader>
        <ModalBody>
          <Form onSubmit={handleZoomSubmit}>
            {zoomError ? <Alert color="danger">{zoomError}</Alert> : null}
            {zoomSuccess ? <Alert color="success">{zoomSuccess}</Alert> : null}

            <FormGroup>
              <Label for="zoomTopic">Topic</Label>
              <Input id="zoomTopic" name="topic" value={zoomFormData.topic} onChange={handleZoomChange} placeholder="Contoh: Standup Harian" required />
            </FormGroup>

            <Row>
              <Col md="6">
                <FormGroup>
                  <Label for="zoomStartTime">Waktu Mulai</Label>
                  <Input id="zoomStartTime" name="startTime" type="datetime-local" value={zoomFormData.startTime} onChange={handleZoomChange} required />
                </FormGroup>
              </Col>
              <Col md="6">
                <FormGroup>
                  <Label for="zoomEndTime">Waktu Berakhir</Label>
                  <Input id="zoomEndTime" name="endTime" type="datetime-local" value={zoomFormData.endTime} onChange={handleZoomChange} required />
                </FormGroup>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button color="secondary" type="button" onClick={() => setIsZoomModalOpen(false)}>
                Batal
              </Button>
              <Button color="success" type="submit" disabled={submittingZoom}>
                {submittingZoom ? 'Menyimpan...' : 'Simpan Booking Zoom'}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      <Modal isOpen={isRoomDetailModalOpen} toggle={closeRoomDetailModal} centered size="lg">
        <ModalHeader toggle={closeRoomDetailModal}>Detail Rapat</ModalHeader>
        <ModalBody>
          {copyMessage ? <Alert color="success">{copyMessage}</Alert> : null}
          {selectedRoomDetail ? (
            <div className="d-flex flex-column" style={{ gap: '14px' }}>
              {(() => {
                const zoomLink = getZoomDataValue(selectedRoomDetail, ['join_url', 'link', 'zoom_link', 'meeting_url', 'start_url', 'url']);
                const zoomMeetingId = getZoomMeetingId(selectedRoomDetail);
                const zoomPassword = getZoomDataValue(selectedRoomDetail, ['password', 'passcode', 'pwd']);
                const zoomFlag = getZoomDataValue(selectedRoomDetail, ['zoom_required', 'zoom', 'is_zoom', 'need_zoom', 'with_zoom']);
                const consumptionFlag = getZoomDataValue(selectedRoomDetail, ['consumption_required', 'consumption', 'is_consumption', 'need_consumption']);
                const roomStatusMeta = getRoomMeetingStatusMeta(selectedRoomDetail);
                const detailRows = [
                  { label: 'Topik', value: getZoomValue(selectedRoomDetail, ['topic', 'title', 'name']) || '-' },
                  { label: 'Deskripsi', value: getZoomValue(selectedRoomDetail, ['description', 'note', 'remarks']) || '-' },
                  { label: 'Ruangan', value: getZoomValue(selectedRoomDetail, ['room', 'ruangan', 'location']) || '-' },
                  { label: 'Peserta', value: getZoomValue(selectedRoomDetail, ['participants', 'jumlah_peserta']) || '-' },
                  { label: 'Waktu Mulai', value: formatZoomDateTime(getZoomValue(selectedRoomDetail, ['start_time', 'startTime', 'start_at', 'start'])) },
                  { label: 'Waktu Selesai', value: formatZoomDateTime(getZoomValue(selectedRoomDetail, ['end_time', 'endTime', 'end_at', 'end'])) },
                  { label: 'Status', value: roomStatusMeta.label },
                  { label: 'Dibooking oleh', value: getCreatorName(selectedRoomDetail) || '-' },
                  { label: 'Butuh Zoom', value: getBooleanLabel(zoomFlag, Boolean(zoomLink)) },
                  { label: 'Butuh Konsumsi', value: getBooleanLabel(consumptionFlag) },
                  { label: 'Detail Konsumsi', value: getZoomValue(selectedRoomDetail, ['consumption_detail', 'consumptionDetail']) || '-' },
                ];

                return (
                  <>
                    <div className="rounded-3" style={{ border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      {detailRows.map((row, index) => (
                        <div
                          key={row.label}
                          className="d-flex justify-content-between align-items-start gap-3 p-3"
                          style={{ borderBottom: index === detailRows.length - 1 ? 'none' : '1px solid #e2e8f0' }}
                        >
                          <div style={{ minWidth: '160px', color: '#475569', fontWeight: 600 }}>{row.label}</div>
                          <div style={{ textAlign: 'right', color: '#0f172a', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{row.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-3 p-3" style={{ border: '1px solid #dbeafe', background: '#f8fbff' }}>
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                        <strong style={{ color: '#1e40af' }}>Link Zoom</strong>
                        {zoomLink ? (
                          <Button
                            color="info"
                            outline
                            size="sm"
                            onClick={() => handleCopyText(zoomLink, 'Link Zoom')}
                            title="Copy Link Zoom"
                            aria-label="Copy Link Zoom"
                          >
                            📋
                          </Button>
                        ) : null}
                      </div>
                      <pre
                        className="mb-0"
                        style={{
                          background: '#0f172a',
                          color: '#e2e8f0',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          fontSize: '12px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {zoomLink || '-'}
                      </pre>
                    </div>

                    <div className="rounded-3" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
                      <div className="d-flex justify-content-between align-items-center gap-3 p-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#475569', fontWeight: 600 }}>ID Rapat Zoom</div>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ color: '#0f172a' }}>{zoomMeetingId || '-'}</div>
                          {zoomMeetingId ? (
                            <Button
                              color="info"
                              outline
                              size="sm"
                              onClick={() => handleCopyText(zoomMeetingId, 'ID Rapat')}
                              title="Copy ID Rapat Zoom"
                              aria-label="Copy ID Rapat Zoom"
                            >
                              📋
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center gap-3 p-3">
                        <div style={{ color: '#475569', fontWeight: 600 }}>Password Zoom</div>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ color: '#0f172a' }}>{zoomPassword || '-'}</div>
                          {zoomPassword ? (
                            <Button
                              color="info"
                              outline
                              size="sm"
                              onClick={() => handleCopyText(zoomPassword, 'Password Zoom')}
                              title="Copy Password Zoom"
                              aria-label="Copy Password Zoom"
                            >
                              📋
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}
        </ModalBody>
      </Modal>

      <Modal isOpen={isZoomDetailModalOpen} toggle={closeZoomDetailModal} centered>
        <ModalHeader toggle={closeZoomDetailModal}>Detail Zoom</ModalHeader>
        <ModalBody>
          {copyMessage ? <Alert color="success">{copyMessage}</Alert> : null}
          {selectedZoomDetail ? (
            (() => {
              const zoomLink = getZoomDataValue(selectedZoomDetail, ['join_url', 'link', 'zoom_link', 'meeting_url', 'start_url', 'url']);
              const zoomMeetingId = getZoomMeetingId(selectedZoomDetail);
              const zoomPassword = getZoomDataValue(selectedZoomDetail, ['password', 'passcode', 'pwd']);
              const zoomStatusMeta = getZoomMeetingStatusMeta(selectedZoomDetail);

              return (
                <div className="d-flex flex-column" style={{ gap: '10px' }}>
                  <div className="d-flex justify-content-between gap-3">
                    <div className="text-muted">Topik</div>
                    <div className="text-end">{getZoomValue(selectedZoomDetail, ['topic', 'title', 'name']) || '-'}</div>
                  </div>
                  <div className="d-flex justify-content-between gap-3">
                    <div className="text-muted">Waktu Mulai</div>
                    <div className="text-end">{formatZoomDateTime(getZoomValue(selectedZoomDetail, ['start_time', 'startTime', 'start_at']))}</div>
                  </div>
                  <div className="d-flex justify-content-between gap-3">
                    <div className="text-muted">Waktu Selesai</div>
                    <div className="text-end">{formatZoomDateTime(getZoomValue(selectedZoomDetail, ['end_time', 'endTime', 'end_at']))}</div>
                  </div>
                  <div className="d-flex justify-content-between gap-3">
                    <div className="text-muted">Status</div>
                    <div className="text-end">{zoomStatusMeta.label}</div>
                  </div>
                  <div className="d-flex justify-content-between gap-3">
                    <div className="text-muted">Dibuat oleh</div>
                    <div className="text-end">{getCreatorName(selectedZoomDetail) || '-'}</div>
                  </div>

                  <div className="mt-2">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="text-muted">Link Zoom</div>
                      {zoomLink ? (
                          <Button
                            color="info"
                            outline
                            size="sm"
                            onClick={() => handleCopyText(zoomLink, 'Link Zoom')}
                            title="Copy Link Zoom"
                            aria-label="Copy Link Zoom"
                          >
                            📋
                        </Button>
                      ) : null}
                    </div>
                    <pre
                      className="mb-0"
                      style={{
                        background: '#0f172a',
                        color: '#e2e8f0',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        fontSize: '12px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}
                    >
                      {zoomLink || '-'}
                    </pre>
                  </div>

                  <div className="d-flex justify-content-between align-items-center gap-3">
                    <div>
                      <div className="text-muted">ID Rapat Zoom</div>
                      <div>{zoomMeetingId || '-'}</div>
                    </div>
                    {zoomMeetingId ? (
                      <Button
                        color="info"
                        outline
                        size="sm"
                        onClick={() => handleCopyText(zoomMeetingId, 'ID Rapat')}
                        title="Copy ID Rapat Zoom"
                        aria-label="Copy ID Rapat Zoom"
                      >
                        📋
                      </Button>
                    ) : null}
                  </div>

                  <div className="d-flex justify-content-between align-items-center gap-3">
                    <div>
                      <div className="text-muted">Password Zoom</div>
                      <div>{zoomPassword || '-'}</div>
                    </div>
                    {zoomPassword ? (
                      <Button
                        color="info"
                        outline
                        size="sm"
                        onClick={() => handleCopyText(zoomPassword, 'Password Zoom')}
                        title="Copy Password Zoom"
                        aria-label="Copy Password Zoom"
                      >
                        📋
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })()
          ) : null}
        </ModalBody>
      </Modal>

      <div className="d-flex justify-content-between align-items-center gap-2 mb-3 p-2 rounded-3 shadow-sm flex-wrap" style={{ background: 'linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%)', border: '1px solid #e6eefc' }}>
        <div className="d-flex gap-2 flex-wrap">
          <Button
            onClick={() => setActiveTab('meeting')}
            style={{
              borderRadius: '999px',
              padding: '8px 16px',
              fontWeight: 600,
              border: activeTab === 'meeting' ? 'none' : '1px solid #cfe0ff',
              background: activeTab === 'meeting' ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' : 'white',
              color: activeTab === 'meeting' ? 'white' : '#2563eb',
              boxShadow: activeTab === 'meeting' ? '0 6px 18px rgba(37, 99, 235, 0.2)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>List Rapat</span>
            <span
              className="rounded-pill px-2 py-1"
              style={{
                background: activeTab === 'meeting' ? 'rgba(255,255,255,0.22)' : '#eaf2ff',
                color: activeTab === 'meeting' ? 'white' : '#2563eb',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {filteredRoomMeetings.length}
            </span>
          </Button>
          <Button
            onClick={() => setActiveTab('zoom')}
            style={{
              borderRadius: '999px',
              padding: '8px 16px',
              fontWeight: 600,
              border: activeTab === 'zoom' ? 'none' : '1px solid #c6f6d5',
              background: activeTab === 'zoom' ? 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)' : 'white',
              color: activeTab === 'zoom' ? 'white' : '#16a34a',
              boxShadow: activeTab === 'zoom' ? '0 6px 18px rgba(22, 163, 74, 0.2)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>List Zoom</span>
            <span
              className="rounded-pill px-2 py-1"
              style={{
                background: activeTab === 'zoom' ? 'rgba(255,255,255,0.22)' : '#ecfdf3',
                color: activeTab === 'zoom' ? 'white' : '#16a34a',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {filteredZoomMeetings.length}
            </span>
          </Button>
        </div>

        <div className="d-flex align-items-center gap-2">

          <Input
            id="scheduleFilter"
            type="select"
            value={scheduleFilter}
            onChange={(event) => setScheduleFilter(event.target.value)}
            style={{ minWidth: '280px', borderRadius: '999px', fontWeight: 600 }}
          >
            <option value={SCHEDULE_FILTER.UPCOMING}>Upcoming</option>
            <option value={SCHEDULE_FILTER.PREVIOUS}>Previous</option>
          </Input>
        </div>
      </div>

      <div className="d-flex flex-column" style={{ gap: '10px' }}>
        {activeTab === 'meeting' ? (
          loadingRoomMeetings ? (
            <Card className="shadow-sm border-0" style={{ borderRadius: '16px' }}>
              <CardBody className="text-muted">Memuat daftar booking ruang...</CardBody>
            </Card>
          ) : filteredRoomMeetings.length === 0 ? (
            <Card className="shadow-sm border-0" style={{ borderRadius: '16px' }}>
              <CardBody className="text-muted">Tidak ada data untuk filter jadwal ini.</CardBody>
            </Card>
          ) : (
            filteredRoomMeetings.map((item) => {
              const id = item.id || item.booking_id || item.meeting_id;
              const title = item.topic || item.title || item.name || 'Rapat';
              const description = item.description || item.note || item.remarks || '';
              const room = item.room || item.ruangan || item.location || 'Ruangan';
              const participants = item.participants || item.jumlah_peserta || '';
              const start = formatZoomDateTime(item.start_time || item.startTime || item.start_at || item.start);
              const end = formatZoomDateTime(item.end_time || item.endTime || item.end_at || item.end);
              const roomStatusMeta = getRoomMeetingStatusMeta(item);

              return (
                <Card key={id} className="shadow-sm border-0" style={{ borderRadius: '16px', cursor: 'pointer' }} onClick={() => openRoomDetailModal(item)}>
                  <CardBody>
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                      <div>
                        <h5 className="mb-1">{title}</h5>
                        <div className="text-muted">{description}</div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <Badge color={roomColors[room]} pill>
                          {room}
                        </Badge>
                        {getZoomDataValue(item, ['join_url', 'link', 'zoom_link', 'meeting_url', 'start_url', 'url']) ? (
                          <Badge
                            color="info"
                            pill
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandedRoom(id);
                            }}
                          >
                            Zoom
                          </Badge>
                        ) : null}

                        {canCancelZoom(item) ? (
                          <Button
                            color="danger"
                            outline
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelRoom(id);
                            }}
                            disabled={cancelingRoomId === id}
                            title="Cancel Booking"
                            aria-label="Cancel Booking"
                          >
                            {cancelingRoomId === id ? '...' : '✖'}
                          </Button>
                        ) : null}
                        {isTruthyValue(getZoomDataValue(item, ['consumption_required', 'consumption', 'is_consumption', 'need_consumption'])) ? (
                          <Button
                            color="secondary"
                            outline
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadConsumptionDoc(item);
                            }}
                            title="Download Dokumen Konsumsi"
                            aria-label="Download Dokumen Konsumsi"
                          >
                            📥
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="d-flex flex-wrap gap-3 text-muted small">
                      <span>📅 {start}</span>
                      <span>🕒 {end}</span>
                      <span>👥 {participants}</span>
                    </div>

                    <div className="mt-3">
                      <Badge color={roomStatusMeta.color} className={roomStatusMeta.textClassName}>
                        Status: {roomStatusMeta.label}
                      </Badge>
                      {getCreatorName(item) ? (
                        <Badge color="secondary" className="text-white ms-2">
                          Dibooking oleh: {getCreatorName(item)}
                        </Badge>
                      ) : null}
                    </div>
                  </CardBody>
                  {expandedRoomIds.includes(id) ? (
                    <CardBody className="pt-0">
                      <div className="small text-muted">
                        {getZoomDataValue(item, ['join_url', 'link', 'zoom_link', 'meeting_url', 'start_url', 'url']) ? (
                          <div>
                            <div><strong>Link:</strong> <a href={getZoomDataValue(item, ['join_url', 'link', 'zoom_link', 'meeting_url', 'start_url', 'url'])} target="_blank" rel="noreferrer">Buka Zoom</a></div>
                            {getZoomMeetingId(item) ? <div><strong>ID:</strong> {getZoomMeetingId(item)}</div> : null}
                            {getZoomDataValue(item, ['password', 'passcode', 'pwd']) ? <div><strong>Password:</strong> {getZoomDataValue(item, ['password', 'passcode', 'pwd'])}</div> : null}
                          </div>
                        ) : (
                          <div className="text-muted">Tidak ada detail Zoom untuk booking ini.</div>
                        )}
                      </div>
                    </CardBody>
                  ) : null}
                </Card>
              );
            })
          )
        ) : (
          loadingZoomMeetings ? (
            <Card className="shadow-sm border-0" style={{ borderRadius: '16px' }}>
              <CardBody className="text-muted">Memuat daftar zoom meeting...</CardBody>
            </Card>
          ) : filteredZoomMeetings.length === 0 ? (
            <Card className="shadow-sm border-0" style={{ borderRadius: '16px' }}>
              <CardBody className="text-muted">Tidak ada data untuk filter jadwal ini.</CardBody>
            </Card>
          ) : (
            filteredZoomMeetings.map((item) => {
              const zid = item.id || item.meeting_id || item.meetingId;
              const title = getZoomValue(item, ['topic', 'title', 'name']) || 'Zoom Meeting';
              const start = formatZoomDateTime(getZoomValue(item, ['start_time', 'startTime', 'start_at']));
              const end = formatZoomDateTime(getZoomValue(item, ['end_time', 'endTime', 'end_at']));
              const zoomStatusMeta = getZoomMeetingStatusMeta(item);

              return (
                <Card key={zid} className="shadow-sm border-0" style={{ borderRadius: '16px', cursor: 'pointer' }} onClick={() => openZoomDetailModal(item)}>
                  <CardBody>
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                      <div>
                        <h5 className="mb-1">{title}</h5>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <Badge
                          color="info"
                          pill
                        >
                          Zoom
                        </Badge>
                        {canCancelZoom(item) ? (
                          <Button
                            color="danger"
                            outline
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelZoom(zid);
                            }}
                            disabled={cancelingZoomId === zid}
                            title="Cancel Booking Zoom"
                            aria-label="Cancel Booking Zoom"
                          >
                            {cancelingZoomId === zid ? '...' : '✖'}
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="d-flex flex-wrap gap-3 text-muted small">
                      <span>📅 {start}</span>
                      <span>🕒 {end}</span>
                    </div>

                    <div className="mt-3 d-flex flex-wrap gap-2">
                      <Badge color={zoomStatusMeta.color} className={zoomStatusMeta.textClassName}>
                        Status: {zoomStatusMeta.label}
                      </Badge>
                      {getCreatorName(item) ? (
                        <Badge color="secondary" className="text-white">
                          Dibuat oleh: {getCreatorName(item)}
                        </Badge>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>
              );
            })
          )
        )}
      </div>
    </>
  );
};

export default Meeting;
