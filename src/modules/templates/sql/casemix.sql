-- Macro: get_casemix
-- Dependencies: fixe
-- Description: Count GHM codes excluding CMD 90 (error codes)

SELECT
    ghm2,
    COUNT(*) AS effectif
FROM {{fixe}}
WHERE SUBSTR(ghm2, 1, 2) != '90'
GROUP BY ghm2
ORDER BY ghm2 ASC
