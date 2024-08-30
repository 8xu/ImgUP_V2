import express from 'express';
import multer from 'multer';

import type { Request, Response } from 'express';

import fs from 'fs';
import path from 'path';

import auth from './middleware/auth';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('uploads'));

const PORT: number = 3000;
const URL = `http://192.168.68.129:${PORT}`;

const idLength = 5;
const idPattern = new RegExp(`^[a-z]{${idLength}}$`);

const acceptedExtensions = ['png', 'jpg', 'jpeg'];

const generateId = async () => {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let id = '';

    for (let i = 0; i < idLength; i++) {
        id += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    if (!idPattern.test(id)) {
        return generateId();
    }

    return id;
};

const upload = multer({
    storage: multer.diskStorage({
        destination: 'uploads/',
        filename: async (req, file, cb,) => {
            console.log(file.mimetype);

            const id = await generateId();

            cb(null, `${id}.${file.mimetype.split('/')[1]}`);
        },
    }),
    fileFilter: (req, file, cb) => {
        const extension = file.mimetype.split('/')[1];

        if (!acceptedExtensions.includes(extension)) {
            cb(new Error('Invalid file type'));

            return;
        }

        cb(null, true);
    },
    limits: {
        fileSize: 2 * 1024 * 1024, // 2 MB
    },
});

app.get('/', async (req: Request, res: Response) => {
    res.json({
        message: 'Hello World!',
    });
});

const API = express.Router();

API.post('/upload', auth, async (req: Request, res: Response) => {
    upload.single('image')(req, res, (err: any) => {
        if (err) {
            res.status(500).json({
                error: err.message,
            });


            console.log(err);

            return;
        }

        const file = req.file as Express.Multer.File;

        const unixTimestamp = Math.floor(Date.now() / 1000);

        return res.json({
            id: file.filename.split('.')[0],
            extension: file.filename.split('.')[1],
            isAcceptedExtension: acceptedExtensions.includes(file.filename.split('.')[1]),
            timestamp: unixTimestamp,
            link: `${URL}/${file.filename}`,
        }); 
    });
});

API.get('/wipe', async (req: Request, res: Response) => {
    fs.readdir('uploads/', (err, files) => {
        if (err) {
            res.status(500).json({
                error: err.message,
            });

            return;
        }

        for (const file of files) {
            fs.unlink(`uploads/${file}`, (err) => {
                if (err) {
                    res.status(500).json({
                        error: err.message,
                    });

                    return;
                }
            });
        }

        res.json({
            message: 'All files have been deleted',
        });
    });
});

app.get('/:image', async (req: Request, res: Response) => {
    const id = req.params.image.split('.')[0];
    const extension = req.params.image.split('.')[1];

    if (!acceptedExtensions.includes(extension)) {
        res.status(400).json({
            error: 'Invalid extension',
        });

        return;
    }

    const files = fs.readdirSync('uploads/');

    console.log(files);

    if (!files.includes(`${id}.${extension}`)) {
        res.status(404).json({
            error: 'Image not found',
        });

        return;
    }

    res.sendFile(`${id}.${extension}`, {
        root: path.join(__dirname, '../uploads')
    });
});

app.use('/api', API);
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Not Found',
    });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});