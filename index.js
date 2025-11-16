// ==========================================================
// ФІНАЛЬНА РОБОЧА ВЕРСІЯ index.js
// ==========================================================

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// --- 1. АРГУМЕНТИ КОМАНДНОГО РЯДКА ---
program
  .requiredOption('-h, --host <type>', 'Server host')
  .requiredOption('-p, --port <type>', 'Server port')
  .requiredOption('-c, --cache <type>', 'Path to uploads directory');
program.parse(process.argv);
const options = program.opts();

const HOST = options.host;
const PORT = options.port;
const RELATIVE_UPLOADS_DIR = options.cache; 

// --- 2. СТВОРЕННЯ АБСОЛЮТНОГО ШЛЯХУ ТА ДИРЕКТОРІЇ ---
const ABSOLUTE_UPLOADS_DIR = path.resolve(__dirname, RELATIVE_UPLOADS_DIR);

if (!fs.existsSync(ABSOLUTE_UPLOADS_DIR)) {
  console.log(`Uploads directory not found. Creating directory: ${ABSOLUTE_UPLOADS_DIR}`);
  fs.mkdirSync(ABSOLUTE_UPLOADS_DIR, { recursive: true });
}

// --- ІНІЦІАЛІЗАЦІЯ EXPRESS ---
const app = express();
const swaggerDocument = YAML.load('./swagger.yaml');

// --- 3. MIDDLEWARE (ПРОМІЖНЕ ПЗ) ---

// Глобальний логер для діагностики (можна потім видалити)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] New request: ${req.method} ${req.originalUrl}`);
  next(); 
});

// Парсери для JSON та URL-encoded даних
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// Роздача статичних файлів (фотографій)
app.use('/photos', express.static(ABSOLUTE_UPLOADS_DIR)); 

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Налаштування multer з абсолютним шляхом
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ABSOLUTE_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- 4. БАЗА ДАНИХ В ПАМ'ЯТІ ---
let inventory = [];

// --- 5. МАРШРУТИ (ЕНДПОІНТИ) ---

// Віддаємо статичні HTML файли
app.get('/RegisterForm.html', (req, res) => res.sendFile(path.join(__dirname, 'RegisterForm.html')));
app.get('/SearchForm.html', (req, res) => res.sendFile(path.join(__dirname, 'SearchForm.html')));

// Реєстрація нового предмету
app.post('/register', upload.single('photo'), (req, res) => {
  console.log('Request reached /register handler. Body:', req.body);
  
  const { inventory_name, description } = req.body;
  if (!inventory_name) {
    return res.status(400).json({ message: 'Inventory name is required' });
  }

  const newItem = {
    id: uuidv4(),
    name: inventory_name,
    description: description || '',
    photoUrl: req.file ? `/photos/${req.file.filename}` : null
  };
  
  inventory.push(newItem);
  res.status(201).json(newItem);
});

// Отримання списку всіх речей
app.get('/inventory', (req, res) => res.status(200).json(inventory));

// ... (решта ваших ендпоінтів: GET /inventory/:id, PUT, DELETE, POST /search) ...
// (я додам їх сюди для повноти, щоб ви були впевнені)

app.get('/inventory/:id', (req, res) => {
    const item = inventory.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.status(200).json(item);
});

app.put('/inventory/:id', (req, res) => {
    const item = inventory.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    const { name, description } = req.body;
    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    res.status(200).json(item);
});

app.delete('/inventory/:id', (req, res) => {
    const itemIndex = inventory.findIndex(i => i.id === req.params.id);
    if (itemIndex === -1) return res.status(404).json({ message: 'Item not found' });
    inventory.splice(itemIndex, 1);
    res.status(200).json({ message: 'Item deleted successfully' });
});

app.post('/search', (req, res) => {
    const { id, includePhoto } = req.body;
    const item = inventory.find(i => i.id === id);
    if (!item) return res.status(404).send('<h2>Item not found by ID</h2>');
    const itemResponse = { ...item };
    if (includePhoto === 'on' && itemResponse.photoUrl) {
        const fullPhotoUrl = `http://${HOST}:${PORT}${itemResponse.photoUrl}`;
        itemResponse.description += `\n\n[Photo Link: ${fullPhotoUrl}]`;
    }
    res.status(200).json(itemResponse);
});


// --- 6. ЗАПУСК СЕРВЕРА ---
app.listen(PORT, HOST, () => {
  console.log(`Server is running at http://${HOST}:${PORT}`);
  console.log(`Uploads are stored in: ${ABSOLUTE_UPLOADS_DIR}`);
  console.log(`API documentation is available at http://${HOST}:${PORT}/docs`);
});