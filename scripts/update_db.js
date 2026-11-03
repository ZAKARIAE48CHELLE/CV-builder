const fs = require("fs");

const dbPath = "data/db.json";
const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const resume = db.folio_user_data_v1.resumes[0];

const projSec = resume.sections.find(s => s.type === "projects");
if (!projSec) {
  console.error("No projects section found");
  process.exit(1);
}

// Check if already added
const exists = projSec.items.some(i => i.title && i.title.includes("Plateforme intelligente"));
if (!exists) {
  const newProject = {
    id: `item-${Date.now()}-automl`,
    visible: true,
    title: "Plateforme intelligente d’AutoML et de Deep Learning assistée par IA générative",
    subtitle: "Projet en conception",
    description: "<p>Conception d’une plateforme intelligente <strong>End-to-End ML/DL</strong> permettant d’automatiser le cycle de vie des projets de Machine Learning : analyse exploratoire des données (EDA), prétraitement, sélection et entraînement des modèles, optimisation des hyperparamètres, évaluation et déploiement. Intégration d’un <strong>LLM et d’un système multi-agents</strong> pour l’orchestration des workflows, avec un constructeur visuel de pipelines, un assistant IA interactif et le suivi des expérimentations.</p>",
    tags: [
      "Generative AI",
      "LLM",
      "Agentic AI",
      "Multi-Agent Systems",
      "AutoML",
      "Deep Learning",
      "MLOps",
      "Hyperparameter Optimization",
      "Data Analytics",
      "Python",
      "PyTorch",
      "Scikit-learn",
      "MLflow",
      "FastAPI"
    ]
  };

  projSec.items.unshift(newProject);
  resume.updatedAt = new Date().toISOString();

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
  console.log("Successfully added project to the TOP of the projects section!");
} else {
  console.log("Project already exists in projects section.");
}

console.log("Current projects list:");
projSec.items.forEach((p, idx) => {
  console.log(`${idx + 1}. ${p.title} (${p.subtitle || 'no subtitle'})`);
});

