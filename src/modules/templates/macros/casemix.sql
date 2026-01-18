SELECT COUNT(ghm2) AS effectif 
FROM fixe
WHERE substr(ghm2, 1, 2) != '90'
ORDER BY ghm2 ASC;