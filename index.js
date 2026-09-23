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

app.get("/", (req, res) => {
    res.render("pages/home", {
        title: "Home | GB College Ramgarh"
    }) ;
  
});
app.get("/feedback", (req, res) => {
    res.render("pages/feedback", {
        title: "Feedback | GB College Ramgarh"
    });
  
});
app.get("/seat-matrix", (req, res) => {
    res.render("pages/seat-matrix", {
        title: "Seat Matrix | GB College Ramgarh"
    });
  
});
app.get("/programs", (req, res) => {
    res.render("pages/programs", {
        title: "Programs Offered | GB College Ramgarh"
    });
  
});
app.get("/affiliation", (req, res) => {
    res.render("pages/affiliation", {
        title: "Affiliation | GB College Ramgarh"
    });
  
});
app.listen(PORT, () => {
    console.log(`server is listening on port ${PORT}`);
});

