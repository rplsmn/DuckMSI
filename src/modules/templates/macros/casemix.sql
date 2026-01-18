SELECT ghm2, COUNT(*) AS effectif 
FROM fixe
WHERE substr(ghm2, 1, 2) != '90'
ORDER BY ghm2 ASC;