const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getNearbyGaushalas = async (pool, lat, lng, limit = 3) => {
  if (!lat || !lng) {
    const [rows] = await pool.query(
      'SELECT *, "Unknown" AS distance FROM gaushala_locations WHERE accepts_peels = 1 LIMIT ?',
      [limit]
    );
    return rows;
  }

  const [rows] = await pool.query(
    `SELECT *,
      (6371 * ACOS(
        COS(RADIANS(?)) * COS(RADIANS(lat)) * COS(RADIANS(lng) - RADIANS(?)) +
        SIN(RADIANS(?)) * SIN(RADIANS(lat))
      )) AS distance
     FROM gaushala_locations
     WHERE accepts_peels = 1
     ORDER BY distance ASC
     LIMIT ?`,
    [lat, lng, lat, limit]
  );

  return rows;
};

module.exports = { haversineDistance, getNearbyGaushalas };
