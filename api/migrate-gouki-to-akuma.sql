UPDATE memos SET my_character = 'Akuma' WHERE my_character = 'Gouki';
UPDATE memos SET opponent_character = 'Akuma' WHERE opponent_character = 'Gouki';
UPDATE combo_memos SET character = 'Akuma' WHERE character = 'Gouki';
UPDATE character_notes SET my_character = 'Akuma' WHERE my_character = 'Gouki';
UPDATE character_notes SET opponent_character = 'Akuma' WHERE opponent_character = 'Gouki';
UPDATE users SET main_character = 'Akuma' WHERE main_character = 'Gouki';
UPDATE users SET sub_characters = REPLACE(sub_characters, '"Gouki"', '"Akuma"') WHERE sub_characters LIKE '%Gouki%';
UPDATE frame_data SET character = 'Akuma' WHERE character = 'Gouki';
