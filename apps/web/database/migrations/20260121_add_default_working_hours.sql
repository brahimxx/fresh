-- Add default working hours for all staff members
-- This ensures staff members are available for bookings

-- Monday to Friday: 9:00 AM - 6:00 PM
-- Saturday: 10:00 AM - 4:00 PM
-- Sunday: Closed (no records)

-- Note: day_of_week in JavaScript: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time)
SELECT 
    id as staff_id,
    1 as day_of_week,  -- Monday
    '09:00:00' as start_time,
    '18:00:00' as end_time
FROM staff
WHERE NOT EXISTS (
    SELECT 1 FROM staff_working_hours 
    WHERE staff_working_hours.staff_id = staff.id 
    AND staff_working_hours.day_of_week = 1
);

INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time)
SELECT 
    id as staff_id,
    2 as day_of_week,  -- Tuesday
    '09:00:00' as start_time,
    '18:00:00' as end_time
FROM staff
WHERE NOT EXISTS (
    SELECT 1 FROM staff_working_hours 
    WHERE staff_working_hours.staff_id = staff.id 
    AND staff_working_hours.day_of_week = 2
);

INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time)
SELECT 
    id as staff_id,
    3 as day_of_week,  -- Wednesday
    '09:00:00' as start_time,
    '18:00:00' as end_time
FROM staff
WHERE NOT EXISTS (
    SELECT 1 FROM staff_working_hours 
    WHERE staff_working_hours.staff_id = staff.id 
    AND staff_working_hours.day_of_week = 3
);

INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time)
SELECT 
    id as staff_id,
    4 as day_of_week,  -- Thursday
    '09:00:00' as start_time,
    '18:00:00' as end_time
FROM staff
WHERE NOT EXISTS (
    SELECT 1 FROM staff_working_hours 
    WHERE staff_working_hours.staff_id = staff.id 
    AND staff_working_hours.day_of_week = 4
);

INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time)
SELECT 
    id as staff_id,
    5 as day_of_week,  -- Friday
    '09:00:00' as start_time,
    '18:00:00' as end_time
FROM staff
WHERE NOT EXISTS (
    SELECT 1 FROM staff_working_hours 
    WHERE staff_working_hours.staff_id = staff.id 
    AND staff_working_hours.day_of_week = 5
);

INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time)
SELECT 
    id as staff_id,
    6 as day_of_week,  -- Saturday
    '10:00:00' as start_time,
    '16:00:00' as end_time
FROM staff
WHERE NOT EXISTS (
    SELECT 1 FROM staff_working_hours 
    WHERE staff_working_hours.staff_id = staff.id 
    AND staff_working_hours.day_of_week = 6
);
