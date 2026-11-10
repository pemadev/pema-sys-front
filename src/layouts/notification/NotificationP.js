import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Bell from '../../components/bell/Bell';
import TaskDetail from '../../components/taskDetail/TaskDetail';
import useAxios from '../../hooks/useAxios';
import { kirimLangganan, pushDidukung } from '../../utils/pushNotif';

const NotificationP = () => {
  const [showTask, setShowTask] = useState(false);
  const [taskId, setTaskId] = useState();

  const api = useAxios();

  const { data, refetch } = useQuery({
    queryKey: ['notification-list'],
    queryFn: () =>
      api.get(`api/notification`).then((res) => {
        return res.data.data;
      }),
  });

  // izin sudah diberikan sebelumnya: perbarui langganan push browser ini (juga saat berganti akun)
  useEffect(() => {
    if (pushDidukung() && Notification.permission === 'granted') {
      kirimLangganan(api).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Bell {...{ setShowTask, setTaskId, data, refetch }} />
      <TaskDetail {...{ showTask, setShowTask, taskId }} />
    </>
  );
};

export default NotificationP;
