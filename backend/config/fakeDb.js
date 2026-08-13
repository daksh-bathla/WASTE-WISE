const fs = require('fs');
const path = require('path');

const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const defaultState = () => ({
  counters: {
    users: 1,
    user_profiles: 1,
    user_medical: 1,
    user_skin: 1,
    user_dietary: 1,
    user_household: 1,
    categories: 1,
    scans: 1,
    items: 1,
    item_components: 1,
    suggestions: 1,
    disclaimers: 1,
    community_ratings: 1,
    scrap_log: 1,
    gaushala_locations: 4,
    electronics_platforms: 8,
  },
  tables: {
    users: [],
    user_profiles: [],
    user_medical: [],
    user_skin: [],
    user_dietary: [],
    user_household: [],
    categories: [],
    scans: [],
    items: [],
    item_components: [],
    suggestions: [],
    disclaimers: [],
    community_ratings: [],
    scrap_log: [],
    gaushala_locations: [
      {
        id: 1,
        name: 'Shri Krishna Gaushala',
        lat: 28.6129,
        lng: 77.2295,
        city: 'Delhi',
        state: 'Delhi',
        accepts_peels: 1,
        accepts_roti: 1,
        accepts_dairy: 1,
        contact: '9999999991',
        verified: 1,
      },
      {
        id: 2,
        name: 'Dharma Gaushala',
        lat: 28.5355,
        lng: 77.3910,
        city: 'Noida',
        state: 'Uttar Pradesh',
        accepts_peels: 1,
        accepts_roti: 1,
        accepts_dairy: 1,
        contact: '9999999992',
        verified: 1,
      },
      {
        id: 3,
        name: 'Green Earth Shelter',
        lat: 28.4595,
        lng: 77.0266,
        city: 'Gurugram',
        state: 'Haryana',
        accepts_peels: 1,
        accepts_roti: 1,
        accepts_dairy: 0,
        contact: '9999999993',
        verified: 0,
      },
    ],
    electronics_platforms: [
      { id: 1, name: 'Cashify', type: 'resale', url: 'https://cashify.in', accepts_brands: null, accepts_categories: null, pays_user: 1, is_doorstep_pickup: 1, coverage_areas: null },
      { id: 2, name: 'Namowaste', type: 'recycling', url: 'https://namowaste.com', accepts_brands: null, accepts_categories: null, pays_user: 0, is_doorstep_pickup: 1, coverage_areas: null },
      { id: 3, name: 'Attero Recycling', type: 'recycling', url: 'https://attero.in', accepts_brands: null, accepts_categories: null, pays_user: 0, is_doorstep_pickup: 0, coverage_areas: null },
      { id: 4, name: 'E-Parisaraa', type: 'recycling', url: 'https://e-parisaraa.com', accepts_brands: null, accepts_categories: null, pays_user: 0, is_doorstep_pickup: 0, coverage_areas: null },
      { id: 5, name: 'Karo Sambhav', type: 'recycling', url: 'https://karosambhav.com', accepts_brands: null, accepts_categories: null, pays_user: 0, is_doorstep_pickup: 0, coverage_areas: null },
      { id: 6, name: 'Goonj', type: 'donation', url: 'https://goonj.org', accepts_brands: null, accepts_categories: null, pays_user: 0, is_doorstep_pickup: 0, coverage_areas: null },
      { id: 7, name: 'OLX', type: 'resale', url: 'https://olx.in', accepts_brands: null, accepts_categories: null, pays_user: 1, is_doorstep_pickup: 0, coverage_areas: null },
    ],
  },
});

const stateFile = path.join(__dirname, 'fake-db-state.json');
let state;

try {
  if (fs.existsSync(stateFile)) {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } else {
    state = defaultState();
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  }
} catch {
  state = defaultState();
}

const save = () => {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Fake DB save error:', error.message);
  }
};

const nextId = (table) => {
  const id = state.counters[table] || 1;
  state.counters[table] = id + 1;
  return id;
};

const pushRow = (table, row) => {
  state.tables[table].push(row);
  save();
  return row;
};

const findById = (table, id) => state.tables[table].find((row) => String(row.id) === String(id));
const findByUserId = (table, userId) => state.tables[table].find((row) => String(row.user_id) === String(userId));
const upsertByUserId = (table, userId, values) => {
  const existing = findByUserId(table, userId);
  if (existing) {
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) existing[key] = value;
    });
    save();
    return existing;
  }
  const row = { id: nextId(table), user_id: userId, ...values };
  return pushRow(table, row);
};

const mergeUserProfile = (user) => {
  const profile = findByUserId('user_profiles', user.id) || {};
  const medical = findByUserId('user_medical', user.id) || {};
  const skin = findByUserId('user_skin', user.id) || {};
  const dietary = findByUserId('user_dietary', user.id) || {};
  const household = findByUserId('user_household', user.id) || {};
  return {
    ...deepClone(user),
    ...deepClone(profile),
    ...deepClone(medical),
    ...deepClone(skin),
    ...deepClone(dietary),
    ...deepClone(household),
    id: user.id,
  };
};

const sum = (rows, selector) => rows.reduce((acc, row) => acc + (Number(selector(row)) || 0), 0);

const toJsonValue = (value) => {
  if (value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

const queryUsersByEmail = (email) => state.tables.users.filter((row) => row.email === email).map(deepClone);

const selectUserProfileRows = (userId) => {
  const user = findById('users', userId);
  return user ? [mergeUserProfile(user)] : [];
};

const selectRecentScans = (userId, limit) => {
  const scans = state.tables.scans
    .filter((row) => String(row.user_id) === String(userId))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit)
    .map((scan) => {
      const item = state.tables.items.find((row) => String(row.scan_id) === String(scan.id));
      const suggestionCount = item
        ? state.tables.suggestions.filter((sug) =>
            state.tables.item_components.some((comp) => String(comp.id) === String(sug.item_component_id) && String(comp.item_id) === String(item.id))
          ).length
        : 0;
      return deepClone({
        id: scan.id,
        input_type: scan.input_type,
        created_at: scan.created_at,
        product_name: item?.product_name || null,
        risk_level: item?.risk_level || null,
        suggestion_count: suggestionCount,
      });
    });
  return scans;
};

const selectScanResults = (scanId, userId) => {
  const scan = state.tables.scans.find((row) => String(row.id) === String(scanId) && String(row.user_id) === String(userId));
  if (!scan) return [];
  const items = state.tables.items.filter((row) => String(row.scan_id) === String(scanId)).map(deepClone);
  const results = [];
  for (const item of items) {
    const components = state.tables.item_components.filter((row) => String(row.item_id) === String(item.id));
    for (const comp of components) {
      const suggestions = state.tables.suggestions.filter((row) => String(row.item_component_id) === String(comp.id));
      for (const sug of suggestions) {
        const disclaimers = state.tables.disclaimers.filter((row) => String(row.suggestion_id) === String(sug.id));
        const ratings = state.tables.community_ratings.filter((row) => String(row.suggestion_id) === String(sug.id) && row.tried_it);
        results.push({
          suggestion: {
            ...deepClone(sug),
            steps: typeof sug.steps === 'string' ? JSON.parse(sug.steps) : deepClone(sug.steps),
          },
          component: deepClone(comp),
          item: deepClone(item),
          disclaimer: disclaimers[0] ? deepClone(disclaimers[0]) : null,
          communityRating: {
            avg_rating: ratings.length ? sum(ratings, (r) => r.rating) / ratings.length : 0,
            total_tried: ratings.length,
          },
        });
      }
    }
  }
  return [{ scan: deepClone(scan), items, results }];
};

const selectCommunityFeed = (limit, offset, whereFn, orderFn) => {
  const posts = state.tables.community_ratings
    .filter((cr) => cr.tried_it)
    .filter(whereFn)
    .sort(orderFn)
    .slice(offset, offset + limit)
    .map((cr) => {
      const user = findById('users', cr.user_id);
      const profile = findByUserId('user_profiles', cr.user_id) || {};
      const suggestion = findById('suggestions', cr.suggestion_id);
      const component = suggestion ? findById('item_components', suggestion.item_component_id) : null;
      const item = component ? findById('items', component.item_id) : null;
      return {
        id: cr.id,
        rating: cr.rating,
        review: cr.review,
        photo_url: cr.photo_url,
        created_at: cr.created_at,
        user_name: user?.name || null,
        user_city: profile.city || null,
        suggestion_title: suggestion?.title || null,
        module_type: suggestion?.module_type || null,
        component_name: component?.component_name || null,
        item_used: item?.product_name || null,
      };
    });
  return posts;
};

const selectGaushalas = (lat, lng, limit) => {
  const rows = state.tables.gaushala_locations
    .filter((row) => row.accepts_peels)
    .map((row) => {
      const distance = lat && lng
        ? (() => {
            const R = 6371;
            const dLat = ((row.lat - lat) * Math.PI) / 180;
            const dLon = ((row.lng - lng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat * Math.PI) / 180) *
                Math.cos((row.lat * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return Number((R * c).toFixed(2));
          })()
        : 'Unknown';
      return { ...deepClone(row), distance };
    })
    .sort((a, b) => (a.distance === 'Unknown' ? 1 : a.distance - b.distance))
    .slice(0, limit);
  return rows;
};

const handleSelectAllFromUserJoin = (userId) => selectUserProfileRows(userId);

const handleSelectProfileField = (table, field, userId) => {
  const row = findByUserId(table, userId);
  return row ? [{ [field]: row[field] }] : [];
};

const parseScrapLogQuery = (sql, params) => {
  const userId = params[0];
  const filters = { item_type: null, date_from: null, date_to: null, action_taken: null };
  let idx = 1;
  if (sql.includes('and item_type = ?')) filters.item_type = params[idx++];
  if (sql.includes('and logged_date >= ?')) filters.date_from = params[idx++];
  if (sql.includes('and logged_date <= ?')) filters.date_to = params[idx++];
  if (sql.includes('and action_taken = ?')) filters.action_taken = params[idx++];
  const limit = params[params.length - 2];
  const offset = params[params.length - 1];
  const rows = state.tables.scrap_log
    .filter((row) => String(row.user_id) === String(userId))
    .filter((row) => (filters.item_type ? row.item_type === filters.item_type : true))
    .filter((row) => (filters.date_from ? row.logged_date >= filters.date_from : true))
    .filter((row) => (filters.date_to ? row.logged_date <= filters.date_to : true))
    .filter((row) => (filters.action_taken ? row.action_taken === filters.action_taken : true))
    .sort((a, b) => String(b.logged_date).localeCompare(String(a.logged_date)));
  return { rows: rows.slice(offset, offset + limit), total: rows.length };
};

const handlers = [
  {
    test: (sql) => sql === 'select id from users where email = ?',
    run: ([email]) => [queryUsersByEmail(email).map(({ id }) => ({ id }))],
  },
  {
    test: (sql) => sql === 'select * from users where email = ?',
    run: ([email]) => [queryUsersByEmail(email)],
  },
  {
    test: (sql) => sql.startsWith('insert into users (name, email, password_hash) values'),
    run: ([name, email, password_hash]) => {
      const row = {
        id: nextId('users'),
        name,
        email,
        password_hash,
        language: 'en',
        streak_count: 0,
        last_active: null,
        created_at: nowIso(),
      };
      pushRow('users', row);
      return [{ insertId: row.id, affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql === 'update users set last_active = curdate() where id = ?',
    run: ([id]) => {
      const user = findById('users', id);
      if (user) user.last_active = today();
      save();
      return [{ affectedRows: user ? 1 : 0 }];
    },
  },
  {
    test: (sql) => sql === 'update users set streak_count = streak_count + 1, last_active = ? where id = ?',
    run: ([date, id]) => {
      const user = findById('users', id);
      if (user) {
        user.streak_count = (Number(user.streak_count) || 0) + 1;
        user.last_active = date;
      }
      save();
      return [{ affectedRows: user ? 1 : 0 }];
    },
  },
  {
    test: (sql) => sql === 'update users set streak_count = 1, last_active = ? where id = ?',
    run: ([date, id]) => {
      const user = findById('users', id);
      if (user) {
        user.streak_count = 1;
        user.last_active = date;
      }
      save();
      return [{ affectedRows: user ? 1 : 0 }];
    },
  },
  {
    test: (sql) => sql === 'update users set name = coalesce(?, name), language = coalesce(?, language) where id = ?',
    run: ([name, language, id]) => {
      const user = findById('users', id);
      if (user) {
        if (name !== undefined && name !== null) user.name = name;
        if (language !== undefined && language !== null) user.language = language;
      }
      save();
      return [{ affectedRows: user ? 1 : 0 }];
    },
  },
  {
    test: (sql) => sql.startsWith('insert into user_profiles'),
    run: ([userId, culture, region, stateVal, city, is_rural, lat, lng]) => {
      const row = upsertByUserId('user_profiles', userId, { culture, region, state: stateVal, city, is_rural, lat, lng });
      return [{ insertId: row.id, affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql.startsWith('insert into user_medical'),
    run: ([userId, conditions, medications, allergies, is_pregnant, age_group]) => {
      const row = upsertByUserId('user_medical', userId, { conditions, medications, allergies, is_pregnant, age_group });
      return [{ insertId: row.id, affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql.startsWith('insert into user_skin'),
    run: ([userId, skin_type, known_reactions, sensitivity_level]) => {
      const row = upsertByUserId('user_skin', userId, { skin_type, known_reactions, sensitivity_level });
      return [{ insertId: row.id, affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql.startsWith('insert into user_dietary'),
    run: ([userId, is_diabetic, is_vegan, is_jain, is_halal, is_gluten_free]) => {
      const row = upsertByUserId('user_dietary', userId, { is_diabetic, is_vegan, is_jain, is_halal, is_gluten_free });
      return [{ insertId: row.id, affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql.startsWith('insert into user_household'),
    run: ([userId, animals, family_members, children_count, elderly_count]) => {
      const row = upsertByUserId('user_household', userId, {
        animals: animals ? JSON.parse(animals) : null,
        family_members,
        children_count,
        elderly_count,
      });
      return [{ insertId: row.id, affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql === 'delete from users where id = ?',
    run: ([id]) => {
      ['users', 'user_profiles', 'user_medical', 'user_skin', 'user_dietary', 'user_household', 'scans', 'items', 'item_components', 'suggestions', 'disclaimers', 'community_ratings', 'scrap_log'].forEach((table) => {
        state.tables[table] = state.tables[table].filter((row) => String(row.user_id || row.id) !== String(id));
      });
      save();
      return [{ affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql === 'select u.*, up.culture, up.region, up.state, up.city, up.is_rural, up.lat, up.lng, um.conditions, um.medications, um.allergies, um.is_pregnant, um.age_group, us.skin_type, us.known_reactions, us.sensitivity_level, ud.is_diabetic, ud.is_vegan, ud.is_jain, ud.is_halal, ud.is_gluten_free, uh.animals, uh.family_members, uh.children_count, uh.elderly_count from users u left join user_profiles up on u.id = up.user_id left join user_medical um on u.id = um.user_id left join user_skin us on u.id = us.user_id left join user_dietary ud on u.id = ud.user_id left join user_household uh on u.id = uh.user_id where u.id = ?',
    run: ([id]) => [selectUserProfileRows(id)],
  },
  {
    test: (sql) => sql.startsWith('select u.*, ') && sql.includes('from users u left join user_profiles up on u.id = up.user_id') && sql.includes('where u.id = ?'),
    run: ([id]) => [selectUserProfileRows(id)],
  },
  {
    test: (sql) => sql === 'select count(*) as count from scans where user_id = ?',
    run: ([userId]) => [[{ count: state.tables.scans.filter((row) => String(row.user_id) === String(userId)).length }]],
  },
  {
    test: (sql) => sql === 'select count(*) as count, coalesce(sum(quantity), 0) as total_weight from scrap_log where user_id = ? and action_taken = "repurposed"',
    run: ([userId]) => {
      const rows = state.tables.scrap_log.filter((row) => String(row.user_id) === String(userId) && row.action_taken === 'repurposed');
      return [[{ count: rows.length, total_weight: sum(rows, (r) => r.quantity) }]];
    },
  },
  {
    test: (sql) => sql === 'select count(*) as count from community_ratings where user_id = ?',
    run: ([userId]) => [[{ count: state.tables.community_ratings.filter((row) => String(row.user_id) === String(userId)).length }]],
  },
  {
    test: (sql) => sql === 'select count(*) as items_logged, coalesce(sum(case when item_type = "food peel" or item_type = "peels" then quantity else 0 end), 0) as peel_weight, coalesce(sum(quantity), 0) as total_weight, count(case when action_taken = "fed_to_animals" then 1 end) as cattle_fed_count from scrap_log where user_id = ? and logged_date >= date_sub(curdate(), interval 7 day)',
    run: ([userId]) => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const rows = state.tables.scrap_log.filter((row) => String(row.user_id) === String(userId) && new Date(row.logged_date) >= since);
      return [[{
        items_logged: rows.length,
        peel_weight: sum(rows.filter((r) => ['Food peel', 'peels'].includes(r.item_type)), (r) => r.quantity),
        total_weight: sum(rows, (r) => r.quantity),
        cattle_fed_count: rows.filter((r) => r.action_taken === 'fed_to_animals').length,
      }]];
    },
  },
  {
    test: (sql) => sql === 'select item_name, count(*) as count, sum(quantity) as total_qty, unit from scrap_log where user_id = ? and logged_date >= date_sub(curdate(), interval 7 day) and (item_type = "food peel" or item_type = "peels") group by item_name',
    run: ([userId]) => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const groups = new Map();
      for (const row of state.tables.scrap_log.filter((r) => String(r.user_id) === String(userId) && new Date(r.logged_date) >= since && ['Food peel', 'peels'].includes(r.item_type))) {
        const current = groups.get(row.item_name) || { item_name: row.item_name, count: 0, total_qty: 0, unit: row.unit };
        current.count += 1;
        current.total_qty += Number(row.quantity) || 0;
        current.unit = row.unit;
        groups.set(row.item_name, current);
      }
      return [[...groups.values()]];
    },
  },
  {
    test: (sql) => sql === 'select streak_count from users where id = ?',
    run: ([id]) => {
      const user = findById('users', id);
      return [[user ? { streak_count: user.streak_count } : {}]];
    },
  },
  {
    test: (sql) => sql.startsWith('insert into scans '),
    run: ([user_id, input_type, location_lat, location_lng, weather_temp, weather_humidity, weather_uv, season]) => {
      const row = {
        id: nextId('scans'),
        user_id,
        input_type,
        location_lat,
        location_lng,
        weather_temp,
        weather_humidity,
        weather_uv,
        season,
        created_at: nowIso(),
      };
      pushRow('scans', row);
      return [{ insertId: row.id, affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql.startsWith('insert into items '),
    run: ([scan_id, product_name, expiry_type, expiry_date, days_past_expiry, risk_level, raw_input, photo_url]) => {
      const row = {
        id: nextId('items'),
        scan_id,
        product_name,
        category_id: null,
        expiry_type,
        expiry_date,
        days_past_expiry,
        risk_level,
        raw_input,
        photo_url,
      };
      pushRow('items', row);
      return [{ insertId: row.id, affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql.startsWith('insert into item_components '),
    run: ([item_id, component_name, component_type, material, condition_status, estimated_quantity]) => {
      const row = {
        id: nextId('item_components'),
        item_id,
        component_name,
        component_type,
        material,
        condition_status,
        estimated_quantity,
        unit: 'percent',
        is_safe_to_repurpose: 1,
        safe_for_body: 1,
        safe_for_animals: 1,
        safe_for_plants: 1,
        safe_for_crafts: 1,
      };
      pushRow('item_components', row);
      return [{ insertId: row.id, affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql.startsWith('select u.*, um.conditions, um.medications, um.allergies, um.is_pregnant, um.age_group, us.skin_type, us.known_reactions, us.sensitivity_level, ud.is_diabetic, ud.is_vegan, ud.is_jain, ud.is_halal, ud.is_gluten_free, uh.animals, uh.family_members, uh.children_count, uh.elderly_count, up.culture, up.region, up.state, up.city, up.is_rural, up.lat, up.lng from users u left join user_medical um on u.id = um.user_id left join user_skin us on u.id = us.user_id left join user_dietary ud on u.id = ud.user_id left join user_household uh on u.id = uh.user_id left join user_profiles up on u.id = up.user_id where u.id = ?'),
    run: ([id]) => [selectUserProfileRows(id)],
  },
  {
    test: (sql) => sql === 'select * from scans where id = ? and user_id = ?',
    run: ([scanId, userId]) => {
      const scan = state.tables.scans.find((row) => String(row.id) === String(scanId) && String(row.user_id) === String(userId));
      return [scan ? [deepClone(scan)] : []];
    },
  },
  {
    test: (sql) => sql === 'select * from scans where id = ?',
    run: ([scanId]) => {
      const scan = state.tables.scans.find((row) => String(row.id) === String(scanId));
      return [scan ? [deepClone(scan)] : []];
    },
  },
  {
    test: (sql) => sql.includes('select * from scans where id = ? and (user_id = ? or user_id is null)'),
    run: ([scanId, userId]) => {
      const scan = state.tables.scans.find((row) =>
        String(row.id) === String(scanId) &&
        (row.user_id === null || String(row.user_id) === String(userId))
      );
      return [scan ? [deepClone(scan)] : []];
    },
  },
  {
    test: (sql) => sql === 'select * from items where scan_id = ?',
    run: ([scanId]) => [state.tables.items.filter((row) => String(row.scan_id) === String(scanId)).map(deepClone)],
  },
  {
    test: (sql) => sql === 'select * from item_components where item_id = ?',
    run: ([itemId]) => [state.tables.item_components.filter((row) => String(row.item_id) === String(itemId)).map(deepClone)],
  },
  {
    test: (sql) => sql === 'select * from item_components where item_id = ? and is_safe_to_repurpose = true',
    run: ([itemId]) => [state.tables.item_components.filter((row) => String(row.item_id) === String(itemId) && row.is_safe_to_repurpose).map(deepClone)],
  },
  {
    test: (sql) => sql === 'select * from suggestions where item_component_id = ?',
    run: ([itemComponentId]) => [state.tables.suggestions.filter((row) => String(row.item_component_id) === String(itemComponentId)).map(deepClone)],
  },
  {
    test: (sql) => sql === 'select * from suggestions where id = ?',
    run: ([id]) => [state.tables.suggestions.filter((row) => String(row.id) === String(id)).map(deepClone)],
  },
  {
    test: (sql) => sql === 'select * from disclaimers where suggestion_id = ?',
    run: ([suggestionId]) => [state.tables.disclaimers.filter((row) => String(row.suggestion_id) === String(suggestionId)).map(deepClone)],
  },
  {
    test: (sql) => sql === 'select avg(rating) as avg_rating, count(*) as total_tried from community_ratings where suggestion_id = ? and tried_it = true',
    run: ([suggestionId]) => {
      const rows = state.tables.community_ratings.filter((row) => String(row.suggestion_id) === String(suggestionId) && row.tried_it);
      return [[{ avg_rating: rows.length ? sum(rows, (r) => r.rating) / rows.length : 0, total_tried: rows.length }]];
    },
  },
  {
    test: (sql) => sql === 'select state from user_profiles where user_id = ?',
    run: ([userId]) => [handleSelectProfileField('user_profiles', 'state', userId)],
  },
  {
    test: (sql) => sql === 'select city, state, lat, lng from user_profiles where user_id = ?',
    run: ([userId]) => {
      const row = findByUserId('user_profiles', userId);
      return [[row ? { city: row.city, state: row.state, lat: row.lat, lng: row.lng } : {}]];
    },
  },
  {
    test: (sql) => sql === 'select lat, lng, city from user_profiles where user_id = ?',
    run: ([userId]) => {
      const row = findByUserId('user_profiles', userId);
      return [[row ? { lat: row.lat, lng: row.lng, city: row.city } : {}]];
    },
  },
  {
    test: (sql) => sql === 'select lat, lng from user_profiles where user_id = ?',
    run: ([userId]) => {
      const row = findByUserId('user_profiles', userId);
      return [[row ? { lat: row.lat, lng: row.lng } : {}]];
    },
  },
  {
    test: (sql) => sql === 'select * from scrap_log where user_id = ?',
    run: ([userId]) => [state.tables.scrap_log.filter((row) => String(row.user_id) === String(userId)).map(deepClone)],
  },
  {
    test: (sql) => sql.startsWith('select * from scrap_log where user_id = ?') && sql.includes('order by logged_date desc limit ? offset ?'),
    run: (params, sql) => {
      const { rows, total } = parseScrapLogQuery(sql, params);
      return [rows.map(deepClone)];
    },
  },
  {
    test: (sql) => sql.startsWith('select count(*) as total from scrap_log where user_id = ?'),
    run: (params, sql) => {
      const { total } = parseScrapLogQuery(sql, [...params, 20, 0]);
      return [[{ total }]];
    },
  },
  {
    test: (sql) => sql === 'insert into scrap_log (user_id, item_name, item_type, quantity, unit, action_taken, logged_date) values (?, ?, ?, ?, ?, ?, ?)',
    run: ([user_id, item_name, item_type, quantity, unit, action_taken, logged_date]) => {
      const row = {
        id: nextId('scrap_log'),
        user_id,
        item_name,
        item_type,
        quantity,
        unit,
        action_taken,
        logged_date,
      };
      pushRow('scrap_log', row);
      return [{ insertId: row.id, affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql === 'select last_active, streak_count from users where id = ?',
    run: ([id]) => {
      const user = findById('users', id);
      return [[user ? { last_active: user.last_active, streak_count: user.streak_count } : {}]];
    },
  },
  {
    test: (sql) => sql === 'select * from community_ratings where suggestion_id = ? and user_id = ?',
    run: ([suggestionId, userId]) => [state.tables.community_ratings.filter((row) => String(row.suggestion_id) === String(suggestionId) && String(row.user_id) === String(userId)).map(deepClone)],
  },
  {
    test: (sql) => sql === 'update community_ratings set rating = ?, review = ?, photo_url = ?, tried_it = true where suggestion_id = ? and user_id = ?',
    run: ([rating, review, photo_url, suggestionId, userId]) => {
      const row = state.tables.community_ratings.find((item) => String(item.suggestion_id) === String(suggestionId) && String(item.user_id) === String(userId));
      if (row) {
        row.rating = rating;
        row.review = review;
        row.photo_url = photo_url;
        row.tried_it = true;
      }
      save();
      return [{ affectedRows: row ? 1 : 0 }];
    },
  },
  {
    test: (sql) => sql === 'insert into community_ratings (suggestion_id, user_id, rating, review, photo_url, tried_it) values (?, ?, ?, ?, ?, ?)',
    run: ([suggestionId, userId, rating, review, photo_url, tried_it]) => {
      const row = {
        id: nextId('community_ratings'),
        suggestion_id: suggestionId,
        user_id: userId,
        rating,
        review,
        photo_url,
        tried_it: Boolean(tried_it),
        created_at: nowIso(),
      };
      pushRow('community_ratings', row);
      return [{ insertId: row.id, affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql === 'select s.id, s.input_type, s.created_at, i.product_name, i.risk_level, (select count(*) from suggestions sg join item_components ic on sg.item_component_id = ic.id where ic.item_id = i.id) as suggestion_count from scans s left join items i on s.id = i.scan_id where s.user_id = ? order by s.created_at desc limit ?',
    run: ([userId, limit]) => [selectRecentScans(userId, limit)],
  },
  {
    test: (sql) => sql.includes('from scans s left join items i on s.id = i.scan_id') && sql.includes('suggestion_count'),
    run: ([userId, limit]) => [selectRecentScans(userId, limit)],
  },
  {
    test: (sql) => sql === 'insert into suggestions (item_component_id, module_type, title, steps, source_url, source_credibility, region_tag, personalisation_note, video_url) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    run: ([item_component_id, module_type, title, steps, source_url, source_credibility, region_tag, personalisation_note, video_url]) => {
      const row = {
        id: nextId('suggestions'),
        item_component_id,
        module_type,
        title,
        steps,
        source_url,
        source_credibility,
        region_tag,
        personalisation_note,
        video_url,
        created_at: nowIso(),
      };
      pushRow('suggestions', row);
      return [{ insertId: row.id, affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql === 'insert into disclaimers (suggestion_id, who_should_not_use, when_to_stop, patch_test_required, medical_boundary, animal_safety_note, quantity_ceiling) values (?, ?, ?, ?, ?, ?, ?)',
    run: ([suggestion_id, who_should_not_use, when_to_stop, patch_test_required, medical_boundary, animal_safety_note, quantity_ceiling]) => {
      const row = {
        id: nextId('disclaimers'),
        suggestion_id,
        who_should_not_use,
        when_to_stop,
        patch_test_required: Boolean(patch_test_required),
        medical_boundary,
        animal_safety_note,
        quantity_ceiling,
      };
      pushRow('disclaimers', row);
      return [{ insertId: row.id, affectedRows: 1 }];
    },
  },
  {
    test: (sql) => sql.startsWith('select id from suggestions where item_component_id in ('),
    run: (params) => {
      const ids = params.map(String);
      const rows = state.tables.suggestions
        .filter((row) => ids.includes(String(row.item_component_id)))
        .map((row) => ({ id: row.id }));
      return [rows];
    },
  },
  {
    test: (sql) => sql.startsWith('delete from disclaimers where suggestion_id in ('),
    run: (params) => {
      const ids = new Set(params.map(String));
      const before = state.tables.disclaimers.length;
      state.tables.disclaimers = state.tables.disclaimers.filter((row) => !ids.has(String(row.suggestion_id)));
      save();
      return [{ affectedRows: before - state.tables.disclaimers.length }];
    },
  },
  {
    test: (sql) => sql.startsWith('delete from suggestions where id in ('),
    run: (params) => {
      const ids = new Set(params.map(String));
      const before = state.tables.suggestions.length;
      state.tables.suggestions = state.tables.suggestions.filter((row) => !ids.has(String(row.id)));
      save();
      return [{ affectedRows: before - state.tables.suggestions.length }];
    },
  },
  {
    test: (sql) => sql === 'select * from electronics_platforms where type = ? order by is_doorstep_pickup desc',
    run: ([type]) => [state.tables.electronics_platforms.filter((row) => row.type === type).sort((a, b) => Number(b.is_doorstep_pickup) - Number(a.is_doorstep_pickup)).map(deepClone)],
  },
  {
    test: (sql) => sql === 'select * from electronics_platforms where type = "resale" order by pays_user desc',
    run: () => [state.tables.electronics_platforms.filter((row) => row.type === 'resale').sort((a, b) => Number(b.pays_user) - Number(a.pays_user)).map(deepClone)],
  },
  {
    test: (sql) => sql === 'select * from electronics_platforms where type = "donation"',
    run: () => [state.tables.electronics_platforms.filter((row) => row.type === 'donation').map(deepClone)],
  },
  {
    test: (sql) => sql === 'select *, "unknown" as distance from gaushala_locations where accepts_peels = 1 limit ?',
    run: ([limit]) => [selectGaushalas(null, null, limit)],
  },
  {
    test: (sql) => sql.includes('from gaushala_locations') && sql.includes('accepts_peels = 1') && sql.includes('order by distance asc'),
    run: ([lat, lng, _lat2, limit]) => [selectGaushalas(lat, lng, limit)],
  },
  {
    test: (sql) => sql.includes('select cr.id, cr.rating, cr.review, cr.photo_url, cr.created_at') && sql.includes('from community_ratings cr'),
    run: ([limit, offset], sql) => {
      const filter = sql.includes('date_sub(curdate(), interval 7 day)') ? 'this_week' : null;
      const order = sql.includes('order by cr.rating desc') ? 'most_rated' : 'latest';
      const rows = selectCommunityFeed(
        limit,
        offset,
        (cr) => {
          if (filter === 'this_week') return true;
          return true;
        },
        (a, b) => {
          if (order === 'most_rated') return Number(b.rating) - Number(a.rating);
          return new Date(b.created_at) - new Date(a.created_at);
        }
      );
      return [rows.map(deepClone)];
    },
  },
  {
    test: (sql) => sql.includes('select s.id, s.title, s.module_type, s.personalisation_note') && sql.includes('from suggestions s join community_ratings cr on s.id = cr.suggestion_id'),
    run: () => {
      const grouped = new Map();
      for (const cr of state.tables.community_ratings.filter((row) => row.tried_it && new Date(row.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))) {
        const suggestion = findById('suggestions', cr.suggestion_id);
        if (!suggestion) continue;
        const current = grouped.get(suggestion.id) || { ...deepClone(suggestion), avg_rating: 0, total_ratings: 0, sum: 0 };
        current.sum += Number(cr.rating) || 0;
        current.total_ratings += 1;
        current.avg_rating = current.sum / current.total_ratings;
        grouped.set(suggestion.id, current);
      }
      const rows = [...grouped.values()].map(({ sum, ...row }) => row).sort((a, b) => Number(b.avg_rating) - Number(a.avg_rating) || Number(b.total_ratings) - Number(a.total_ratings)).slice(0, 5);
      return [rows];
    },
  },
  {
    test: (sql) => sql.includes('select up.city, count(distinct sl.id) as items_repurposed') && sql.includes('from scrap_log sl join user_profiles up on sl.user_id = up.user_id'),
    run: () => {
      const byCity = new Map();
      for (const sl of state.tables.scrap_log.filter((row) => row.action_taken === 'repurposed' && new Date(row.logged_date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))) {
        const profile = findByUserId('user_profiles', sl.user_id);
        if (!profile?.city) continue;
        const current = byCity.get(profile.city) || { city: profile.city, items_repurposed: 0, seen: new Set() };
        current.seen.add(sl.id);
        current.items_repurposed = current.seen.size;
        byCity.set(profile.city, current);
      }
      return [[...byCity.values()].map(({ seen, ...row }) => row).sort((a, b) => Number(b.items_repurposed) - Number(a.items_repurposed)).slice(0, 10)];
    },
  },
  {
    test: (sql) => sql === 'update item_components set is_safe_to_repurpose = ? where id = ?',
    run: ([isSafe, id]) => {
      const row = findById('item_components', id);
      if (row) row.is_safe_to_repurpose = isSafe ? 1 : 0;
      save();
      return [{ affectedRows: row ? 1 : 0 }];
    },
  },
  {
    test: (sql) => sql.includes('select * from users u left join user_profiles up on u.id = up.user_id') && sql.includes('left join user_medical um on u.id = um.user_id') && sql.includes('left join user_skin us on u.id = us.user_id') && sql.includes('left join user_dietary ud on u.id = ud.user_id') && sql.includes('left join user_household uh on u.id = uh.user_id') && sql.includes('where u.id = ?'),
    run: ([id]) => [selectUserProfileRows(id)],
  },
  {
    test: (sql) => sql.includes('select u.*, up.culture, up.state, up.city, up.is_rural, up.lat, up.lng, up.language') && sql.includes('from users u') && sql.includes('where u.id = ?'),
    run: ([id]) => [selectUserProfileRows(id)],
  },
  {
    test: (sql) => sql.includes('select * from scans where id = ? and user_id = ?') || sql.includes('select * from scans where id = ? and user_id = ?'),
    run: ([scanId, userId]) => {
      const scan = state.tables.scans.find((row) => String(row.id) === String(scanId) && String(row.user_id) === String(userId));
      return [scan ? [deepClone(scan)] : []];
    },
  },
];

const query = async (sql, params = []) => {
  const normalized = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();

  for (const handler of handlers) {
    try {
      if (handler.test(normalized)) {
        return handler.run(params, normalized);
      }
    } catch (error) {
      console.error('Fake DB handler error for:', normalized, error.message);
      throw error;
    }
  }

  console.error('Fake DB missing handler for:', normalized, params);
  return [[]];
};

module.exports = { query, end: async () => {}, state };
