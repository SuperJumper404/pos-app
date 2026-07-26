const assert = require('assert')
const fs = require('fs')
const path = require('path')

const sourceDirectories = [
  'pages',
  'components',
  'layouts',
  'helpers',
  'store',
  'plugins',
  'middleware',
]

const forbiddenCopy = [
  { label: 'encodage UTF-8 corrompu', pattern: /Ã.|Â.|â[€™œ“”]|�/u },
  { label: '« Cuisine fermée »', pattern: /Cuisine fermee/u },
  { label: '« En préparation »', pattern: /En preparation/u },
  { label: '« Détails »', pattern: />\s*Details\s*</u },
  { label: '« Déjà payé »', pattern: /\b[Dd]eja paye(?:es)?\b/u },
  { label: '« Clôturer »', pattern: /\bCloturer\b/u },
  { label: '« Commande remboursée »', pattern: /Commande remboursee/u },
  { label: '« Compte créé »', pattern: /Compte cree/u },
  { label: '« à terminer »', pattern: /onboarding Stripe a terminer/u },
  { label: 'confirmation correctement accentuée', pattern: /Etes(?:-| )vous sur/u },
  { label: 'notification Stripe accentuée', pattern: /Paiement envoye|confirmee par Stripe/u },
  { label: '« À encaisser »', pattern: /\bA encaisser\b/u },
  { label: '« Statut »', pattern: />\s*Status\s*<|text: 'Status'|label="Status|Un status/u },
  { label: '« IP »', pattern: /Adresse Ip/u },
  { label: 'accord des moyens de paiement', pattern: /moyens de paiements disponible/u },
  { label: 'accord des clients', pattern: /vos client\b/u },
  { label: '« événements »', pattern: /évenements/u },
  { label: 'statut de commande au participe passé', pattern: />\s*(?:Terminer|Annuler)\s*<\/v-chip/u },
  { label: 'ponctuation du message invalide', pattern: /invalide!/u },
  { label: 'article du nom d’utilisateur', pattern: /Nom d'utilisateur doit/u },
  { label: 'titre « Commandes »', pattern: /<h6>commandes\s*:/u },
  { label: 'libellés du rapport en français', pattern: />\s*(?:Payment|Order|Pending|Approve)\s*<|['"](?:Pending|Approve)['"]/u },
  { label: 'écrans vides en français', pattern: /Categories Empty|Product Empty|Empty!/u },
  { label: 'chargement en français', pattern: />\s*Loading\s*</u },
  { label: 'recherche du rapport en français', pattern: /Search ordernumber|Seaching|Order Number|>Customer<|>Operator</u },
  { label: 'gestion des stocks en français', pattern: /Form New Category|Products riquired|Quatity required|Insert quantity|Remark required|Input text Add or Reduce or Adjustmen|Remark wajib diisi|Search name operator/u },
  { label: 'édition des catégories en français', pattern: /Name category required|Insert category name|>\s*Submit\s*</u },
  { label: 'configuration des tables en français', pattern: /Changer mots de passe par defaut|Web Site Url|Table mail required|Tables vide/u },
  { label: 'activation du compte en français', pattern: /Take me to login page|Something not good|Maybe, your token|Go to dashboard/u },
  { label: '« Le paiement a échoué »', pattern: /Le paiement a echoue/u },
  { label: 'ponctuation du bouton de suppression', pattern: /supprimer!/u },
  { label: 'champs utilisateur en français', pattern: /label="(?:Username|Phone)"|Input username/u },
  { label: 'horaires en français', pattern: /label="(?:From|To)"/u },
  { label: 'infinitif du champ de recherche', pattern: /placeholder="Recherche une commande/u },
  { label: 'sigle SIRET', pattern: /S\.I\.R\.E\.T/u },
  { label: '« e-mail » dans les textes visibles', pattern: /Vérifiez votre email|label="Email"|'Email de la table|l'email de la table/u },
]

function listSourceFiles(directory) {
  const absoluteDirectory = path.join(__dirname, '..', directory)
  if (!fs.existsSync(absoluteDirectory)) return []

  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return listSourceFiles(relativePath)
    return /\.(?:js|vue)$/.test(entry.name) ? [relativePath] : []
  })
}

const failures = []

sourceDirectories.flatMap(listSourceFiles).forEach((relativePath) => {
  const content = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
  content.split(/\r?\n/).forEach((line, index) => {
    forbiddenCopy.forEach(({ label, pattern }) => {
      if (pattern.test(line)) {
        failures.push(`${relativePath}:${index + 1} — ${label}: ${line.trim()}`)
      }
    })
  })
})

assert.deepStrictEqual(
  failures,
  [],
  `Des textes français doivent être corrigés :\n${failures.join('\n')}`
)

console.log('French copy tests passed')
