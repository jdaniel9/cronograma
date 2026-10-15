-- Ejecutar completo en Supabase > SQL Editor (una vez por proyecto: dev y prod)
create type rol_t as enum ('supervisor','jefatura','solicitante');
create type clase_t as enum ('administrativa','operativa');
create type origen_t as enum ('recurrente','extraordinaria','proyecto_nuevo');
create type estado_t as enum ('pendiente','en_proceso','cumplida','cumplida_tarde','no_cumplida');

create table departamentos (id serial primary key, nombre text unique not null);
insert into departamentos(nombre) values ('GDP'),('INVENTARIO'),('COMPRA'),('COORDINACION');

create table perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text unique not null,             -- igual al del Excel, ej: EDDY VELEZ
  rol rol_t not null,
  departamento_id int references departamentos,  -- solo para solicitantes
  telefono text,                           -- WhatsApp, formato 593999999999
  activo boolean default true
);

create table proyectos (
  id serial primary key,
  nombre text unique not null,
  empresa text,
  estado text default 'Activo',            -- Activo / Por iniciar / Cerrado
  supervisor_id uuid references perfiles,
  apoyo_id uuid references perfiles,
  fecha_inicio date,
  observaciones text
);

create table auxiliares (                  -- solo datos, no inician sesión
  id serial primary key,
  nombre text not null,
  proyecto_id int references proyectos,
  activo boolean default true
);

create table tipos_actividad (
  id serial primary key,
  nombre text unique not null,
  clase clase_t not null
);
insert into tipos_actividad(nombre,clase) values
 ('Informe','administrativa'),('Abastecimiento','administrativa'),('Corte','administrativa'),
 ('Pedido de insumos','administrativa'),
 ('Entrega de insumos','operativa'),('Revisión de puestos','operativa'),('Firma de documentos','operativa');

create table solicitudes (
  id serial primary key,
  departamento_id int references departamentos not null,
  solicitante_id uuid references perfiles not null,
  proyecto_id int references proyectos,
  tipo_id int references tipos_actividad,
  descripcion text not null,
  fecha_requerida date,
  estado text default 'nueva',             -- nueva / agendada / rechazada
  creado timestamptz default now()
);

create table actividades (
  id serial primary key,
  codigo text unique,
  proyecto_id int references proyectos,
  tipo_id int references tipos_actividad not null,
  titulo text not null,
  clase clase_t not null,
  origen origen_t default 'recurrente',
  departamento_id int references departamentos,   -- quién la solicita
  solicitud_id int references solicitudes,
  responsable_id uuid references perfiles,
  inicio date,
  limite date,
  estado estado_t default 'pendiente',
  avance int default 0 check (avance between 0 and 100),
  fecha_real date,
  motivo text,                                    -- obligatorio si tarde / no cumplida
  observaciones text
);
create index on actividades (responsable_id, limite);

create table notificaciones (                     -- para WhatsApp (fase 3)
  id serial primary key,
  actividad_id int references actividades,
  perfil_id uuid references perfiles,
  canal text default 'whatsapp',
  enviado_at timestamptz default now()
);

-- Seguridad (RLS)
create function mi_rol() returns rol_t language sql stable security definer set search_path=public
as $$ select rol from perfiles where id = auth.uid() $$;

do $$ declare t text; begin
  foreach t in array array['departamentos','perfiles','proyectos','auxiliares','tipos_actividad','solicitudes','actividades','notificaciones'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
  foreach t in array array['departamentos','perfiles','proyectos','auxiliares','tipos_actividad'] loop
    execute format('create policy "%1$s_leer" on %1$I for select to authenticated using (true)', t);
    execute format('create policy "%1$s_jefe" on %1$I for all to authenticated using (mi_rol()=''jefatura'') with check (mi_rol()=''jefatura'')', t);
  end loop;
end $$;

create policy act_leer on actividades for select to authenticated
  using (mi_rol()='jefatura' or responsable_id = auth.uid());
create policy act_editar on actividades for update to authenticated
  using (mi_rol()='jefatura' or responsable_id = auth.uid());
create policy act_jefe on actividades for all to authenticated
  using (mi_rol()='jefatura') with check (mi_rol()='jefatura');

create policy sol_leer on solicitudes for select to authenticated
  using (mi_rol()='jefatura' or solicitante_id = auth.uid());
create policy sol_crear on solicitudes for insert to authenticated
  with check (solicitante_id = auth.uid() and mi_rol() in ('solicitante','jefatura'));
create policy sol_jefe on solicitudes for all to authenticated
  using (mi_rol()='jefatura') with check (mi_rol()='jefatura');

create policy notif_jefe on notificaciones for all to authenticated
  using (mi_rol()='jefatura') with check (mi_rol()='jefatura');
