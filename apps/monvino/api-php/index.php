<?php
// Front Controller (Contrôleur Pilote)
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$urlRequete = $_SERVER['REQUEST_URI'];

$routeur = new Routeur(
    parse_url($urlRequete, PHP_URL_PATH),
    $_GET,
    $_SERVER['REQUEST_METHOD']
);

$routeur->invoquerRoute();

class Routeur
{
    private $route = '';
    private $params = '';
    private $methode = '';

    function __construct($r, $p, $m)
    {
        $this->route = $r;
        $this->params = $p;
        $this->methode = $m;

        // Autochargement des fichiers de classe
        spl_autoload_register(function ($nomClasse) {
            $nomFichier = "$nomClasse.cls.php";
            if (file_exists("controleurs/$nomFichier")) {
                include("controleurs/$nomFichier");
            } else if (file_exists("modeles/$nomFichier")) {
                include("modeles/$nomFichier");
            }
        });
    }

    public function invoquerRoute()
    {
        $collection = "celliers";
        $idEntite = [];
        $params = [];


        $partiesRoute = explode('/', $this->route);

        // Debugging du routeur:

        // print_r($partiesRoute);
        // echo '<hr>';
        // echo 'Paramètres (querystring) : ' . $this->params;
        // echo '<hr>';
        // echo 'Méthod HTTP : ' . $this->methode;


        // Routes look like:
        //   /api-php/{clé}/{valeur}/{collection}[/{idKey}/{idVal}]
        //   /api-php/index.php/{clé}/{valeur}/{collection}[/{idKey}/{idVal}]
        //   /PW2/cellier-projet/api-php/... (legacy school path)
        // Apache rewrite keeps REQUEST_URI without index.php, so parse from "api-php".
        $apiPhp = array_search('api-php', $partiesRoute, true);
        if ($apiPhp !== false) {
            $offset = $apiPhp + 1;
            if (
                isset($partiesRoute[$offset]) &&
                $partiesRoute[$offset] === 'index.php'
            ) {
                $offset++;
            }
            if (
                count($partiesRoute) > $offset + 2 &&
                trim(urldecode($partiesRoute[$offset + 2])) !== ''
            ) {
                $collection = trim(urldecode($partiesRoute[$offset + 2]));
                $params = [
                    trim(urldecode($partiesRoute[$offset])) =>
                    trim(urldecode($partiesRoute[$offset + 1])),
                ];
                if (
                    count($partiesRoute) > $offset + 4 &&
                    trim(urldecode($partiesRoute[$offset + 4] ?? '')) !== ''
                ) {
                    $idEntite = [
                        trim(urldecode($partiesRoute[$offset + 3])) =>
                        trim(urldecode($partiesRoute[$offset + 4])),
                    ];
                }
            }
        }

        if (is_array($this->params) && $this->params !== []) {
            $params = array_merge($params, $this->params);
        }

        $nomControleur = ucfirst($collection) . 'Controleur';
        $nomModele = ucfirst($collection) . 'Modele';

        if (class_exists($nomControleur)) {
            $controleur = new $nomControleur($nomModele);
            switch ($this->methode) {
                case 'GET':
                    if ($idEntite) {
                        $controleur->un($params, $idEntite);
                    } else {
                        $controleur->tout($params);
                    }
                    break;
                case 'POST':
                    $controleur->ajouter(file_get_contents('php://input'));
                    break;
                case 'PUT':
                    if (isset($idEntite)) {
                        $controleur->remplacer($idEntite, file_get_contents('php://input'));
                    } else {
                        $controleur->changer($params, file_get_contents('php://input'));
                    }
                    break;
                case 'PATCH':
                    if (isset($idEntite)) {
                        $controleur->changer($params, $idEntite, file_get_contents('php://input'));
                    } else {
                        $controleur->changer($params, file_get_contents('php://input'));
                    }
                    break;
                case 'DELETE':
                    if ($idEntite) {
                        $controleur->retirer($params, $idEntite);
                    } else {
                        $controleur->retirer($params);
                    }
                    break;
            }
        } else {
            exit("Mauvaise requête (à compléter)");
        }
    }
}
