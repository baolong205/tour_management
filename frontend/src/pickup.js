export function pickupBody(meetingPoint, rows) {
  if (meetingPoint.trim().length > 255) throw new Error('Điểm tập trung tối đa 255 ký tự.');
  if (rows.length > 30) throw new Error('Mỗi lịch có tối đa 30 điểm đón.');
  return {
    meetingPoint: meetingPoint.trim(),
    checkpoints: rows.map((row, index) => {
      const name = row.name.trim();
      const dayNo = Number(row.dayNo);
      if (!name || name.length > 200) throw new Error(`Điểm đón ${index + 1}: nhập tên từ 1 đến 200 ký tự.`);
      if (!Number.isInteger(dayNo) || dayNo < 1 || dayNo > 365) throw new Error(`Điểm đón ${index + 1}: ngày phải từ 1 đến 365.`);
      if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(row.meetTime)) throw new Error(`Điểm đón ${index + 1}: giờ phải theo dạng HH:mm.`);
      return { name, dayNo, meetTime: row.meetTime, sortOrder: index };
    }),
  };
}