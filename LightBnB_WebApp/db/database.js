const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require("pg");

const pool = new Pool({
   user: "development",
   password: "development",
   host: "localhost",
   database: "lightbnb",
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  if(!email){
    return Promise.reject(new Error("Email is required"));
  }
  return pool.query(`SELECT * FROM users
    WHERE email = $1;`, [email])
    .then((result) => {
      // below we are checking if we received an array of objects
      if(result.rows.length > 0){
        return result.rows[0]; 
      } else {
        return null; // no user is found
      }
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  if (!id) {
    return Promise.reject(new Error("ID is required"));
  }
  return pool.query(`SELECT * FROM users
    WHERE id = $1;`, [id])
    .then((result) => {
      // below we are checking if we received an array of objects
      if(result.rows.length > 0){
        return result.rows[0]; 
      } else {
        return null; // no user is found
      }
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
   const {name, email, password} = user;

   return pool
         .query(
          `INSERT INTO users (name, email, password)
          VALUES ($1, $2, $3)
          RETURNING *;
          `,
        [name, email, password])
        .then((result) => {
          return result.rows[0]; 
        })
        .catch((err) => {
            console.log(err.message);
        });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  
 return pool
 .query(
  `
  SELECT reservations.*, 
  properties.*,
  AVG(property_reviews.rating) as average_rating
FROM properties
JOIN reservations ON properties.id = reservations.property_id
JOIN property_reviews ON reservations.id = reservation_id
WHERE reservations.guest_id = $1
GROUP BY reservations.id, properties.id
ORDER BY reservations.start_date ASC 
LIMIT $2;
`, [guest_id, limit])
.then((result) => {
  return result.rows;
})
.catch((err) => {
  console.log(err.message);
  throw err;
});
  
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {

const queryParams = [];

let queryString = `SELECT properties.*, avg(property_reviews.rating) as average_rating
FROM properties
JOIN property_reviews ON properties.id = property_id
`;

// Add filters dynamically
let hasWhere = false; // Track if WHERE has been added
if (options.city) {
  queryParams.push(`%${options.city}%`);
  queryString += `${hasWhere ? ' AND' : ' WHERE'} city LIKE $${queryParams.length}`;
  hasWhere = true;
}

if (options.owner_id) {
  queryParams.push(options.owner_id);
  queryString += `${hasWhere ? ' AND' : ' WHERE'} owner_id = $${queryParams.length}`;
  hasWhere = true;
}


  // Add price range filter only if both minimum and maximum price are provided
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100); // Convert dollars to cents
    queryParams.push(options.maximum_price_per_night * 100); // Convert dollars to cents
    queryString += `${hasWhere ? ' AND' : ' WHERE'} cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length}`;
    hasWhere = true;
  }
  
// Add GROUP BY clause
queryString += `
GROUP BY properties.id
`;

// Add HAVING clause for aggregate filters
if (options.minimum_rating) {
queryParams.push(options.minimum_rating);
queryString += ` HAVING avg(property_reviews.rating) >= $${queryParams.length}`;
}

// Add ORDER BY and LIMIT clauses
queryParams.push(limit);
queryString += `
ORDER BY cost_per_night
LIMIT $${queryParams.length};
`;

console.log(queryString, queryParams);

// Execute query
return pool.query(queryString, queryParams)
.then((result) => {return result.rows})
.catch((err) => {
  console.log(err.message);
});
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
