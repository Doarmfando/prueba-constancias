-- ================================================
-- CONFIGURACIÓN DE POLÍTICAS PARA SUPABASE STORAGE
-- Bucket: Archivos
-- ================================================

-- IMPORTANTE: Estas políticas permiten a usuarios autenticados
-- subir, ver y eliminar archivos en el bucket "Archivos"

-- 1. Política para VER archivos (SELECT/READ)
CREATE POLICY "Usuarios autenticados pueden ver archivos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'Archivos');

-- 2. Política para SUBIR archivos (INSERT/UPLOAD)
CREATE POLICY "Usuarios autenticados pueden subir archivos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Archivos');

-- 3. Política para ACTUALIZAR archivos (UPDATE)
CREATE POLICY "Usuarios autenticados pueden actualizar archivos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Archivos')
WITH CHECK (bucket_id = 'Archivos');

-- 4. Política para ELIMINAR archivos (DELETE)
CREATE POLICY "Usuarios autenticados pueden eliminar archivos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Archivos');

-- Verificar políticas creadas
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;
