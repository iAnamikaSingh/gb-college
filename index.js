import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import ejsMate from "ejs-mate";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

app.set('view engine', 'ejs');
app.engine("ejs", ejsMate);

app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));

// canonical middleware, before the routes
const BASE_URL = 'https://gbc-ramgarh.onrender.com';
app.use((req, res, next) => {
  res.locals.canonical = BASE_URL + req.path;
  next();
});

//routes
app.get("/", (req, res) => {
    res.render("pages/generic/home", {
        title: "Home | GB College Ramgarh",
        description:"Gram Bharti College, Ramgarh, Kaimur (Bihar): UGC-registered VKSU constituent college offering B.A., B.Sc., B.Com., BCA and BBA. Explore programmes and seats."
    }) ;
  
});
app.get("/seat-matrix", (req, res) => {
    res.render("pages/generic/seat-matrix", {
        title: "Seat Matrix | GB College Ramgarh",
        description:"Programme-wise seat availability at Gram Bharti College, Ramgarh, Kaimur (Bihar) for B.A., B.Sc., B.Com., BCA and BBA courses."
    
    });
  
});
app.get("/pyq/bca", (req, res) => {
    res.render("pages/generic/pyq/bca", {
        title: "Sem-2 2025-2028 Exam Paper | GB College Ramgarh",
        description:"Download the question paper of BCA Sem-2 2025-2028 and their detailed solution at gbc-ramgarh.onrender.com"
    });
  
});
app.get("/programs", (req, res) => {
    res.render("pages/generic/programs", {
        title: "Programs Offered | GB College Ramgarh",
        description:"Explore undergraduate programmes at Gram Bharti College, Ramgarh: B.A., B.Sc., B.Com., BCA and BBA  details."
    });
  
});
app.get("/admin/pyq/bca/new/exampaper", (req, res) => {
    res.render("pages/admin/pyq/bca/add-exampaper", {
        title: "Add BCA Papers | Admin | GB College Ramgarh",
        description: "Admin form to upload a combined question paper by semester and year.",
        noindex: true
    });
});
app.get("/admin/pyq/bca/new/exampaper-solution", (req, res) => {
    res.render("pages/admin/pyq/bca/add-exampaper-solution", {
        title: "Add BCA Paper Solutions | Admin | GB College Ramgarh",
        description: "Admin form to upload solution PDF for each BCA subject, by semester and year.",
        noindex: true
    });
});
app.use((req, res) => {
    res.status(404).render("pages/error", {
        statusCode: 404,
        message: "Page Not Found",
        title:"Error",
        description: "The requested page could not be found."
    });
});
app.listen(PORT, () => {
    console.log(`server is listening on port ${PORT}`);
});

