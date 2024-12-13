SELECT reservations.id, properties.title, reservations.start_date, properties. cost_per_night, AVG(property_reviews.rating) as average_rating
FROM properties
JOIN reservations ON properties.id = reservations.property_id
JOIN property_reviews ON properties.id = property_reviews.property_id
WHERE reservations.guest_id = 1
GROUP BY reservations.id, properties.id
ORDER BY reservations.start_date ASC 
LIMIT 10;