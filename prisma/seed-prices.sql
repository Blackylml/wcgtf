INSERT INTO "ModuleSettings" ("module","price","entryOpen")
VALUES ('MATCHES_G1'::"Module",50,true),('MATCHES_G2'::"Module",50,true),('MATCHES_G3'::"Module",50,true)
ON CONFLICT ("module") DO UPDATE SET "price"=EXCLUDED."price","entryOpen"=EXCLUDED."entryOpen";
