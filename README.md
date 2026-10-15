# Cronograma de supervisión (fase 1)

## Puesta en marcha local
1. `npm install`
2. Crea un proyecto en supabase.com llamado `cronograma-dev`. En SQL Editor pega y ejecuta `supabase/schema.sql`.
3. Copia `.env.example` a `.env.local` y completa las claves (Project Settings > API).
4. Authentication > Users > Add user: crea a tu jefatura, Eddy y Luis (con contraseña).
5. En SQL Editor registra sus perfiles (cambia los UUID por los de cada usuario):
```sql
insert into perfiles(id,nombre,rol,telefono) values
 ('UUID-JEFE','NOMBRE JEFE','jefatura','593999999999'),
 ('UUID-EDDY','EDDY VELEZ','supervisor','593999999999'),
 ('UUID-LUIS','LUIS HARO','supervisor','593999999999');
```
6. Importa tu Excel: `npm run import -- ruta/Cronograma_Integral_Supervisores_Limpieza.xlsx`
7. `npm run dev` y abre http://localhost:5173
8. `npm test` antes de cada commit.

## Subir a GitHub
1. Repo vacío en GitHub llamado `cronograma` (si usas otro nombre, cámbialo en `vite.config.js`).
2. `git add . && git commit -m "Fase 1" && git branch -M main && git remote add origin URL && git push -u origin main`
3. Settings > Pages > Source: GitHub Actions.
4. Settings > Secrets > Actions: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del proyecto **prod**.
5. Trabaja en la rama `develop`; solo lo que pasa a `main` por Pull Request se publica.
6. En Supabase prod (Authentication > URL Configuration) agrega tu enlace de GitHub Pages.
