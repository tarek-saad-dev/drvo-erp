-- SQL Server schema health / READ ONLY; 2026-11-22.
-- Authorized operator chooses the connection/DB externally. No USE, DDL, DML, DBCC, dynamic SQL or customer row access.
-- This checks metadata visibility only; restricted logins may see an incomplete catalog.
SET NOCOUNT ON;
SELECT DB_NAME() AS DatabaseName, SYSDATETIMEOFFSET() AS InspectedAtLocal, @@VERSION AS SqlServerVersion;

SELECT
 s.name AS SchemaName,
 COUNT(t.object_id) AS UserTableCount,
 (SELECT COUNT(*) FROM sys.indexes i JOIN sys.tables t2 ON t2.object_id=i.object_id WHERE t2.schema_id=s.schema_id AND i.index_id>0 AND i.is_hypothetical=0) AS IndexCountExcludingHeap,
 (SELECT COUNT(*) FROM sys.indexes i JOIN sys.tables t2 ON t2.object_id=i.object_id WHERE t2.schema_id=s.schema_id AND i.is_unique=1 AND i.index_id>0 AND i.is_hypothetical=0) AS UniqueIndexCount,
 (SELECT COUNT(*) FROM sys.indexes i JOIN sys.tables t2 ON t2.object_id=i.object_id WHERE t2.schema_id=s.schema_id AND i.has_filter=1 AND i.index_id>0) AS FilteredIndexCount,
 (SELECT COUNT(*) FROM sys.foreign_keys fk JOIN sys.tables t2 ON t2.object_id=fk.parent_object_id WHERE t2.schema_id=s.schema_id) AS ForeignKeyCount,
 (SELECT COUNT(*) FROM sys.foreign_keys fk JOIN sys.tables t2 ON t2.object_id=fk.parent_object_id WHERE t2.schema_id=s.schema_id AND (fk.is_disabled=1 OR fk.is_not_trusted=1)) AS DisabledOrUntrustedFkCount,
 (SELECT COUNT(*) FROM sys.check_constraints ck JOIN sys.tables t2 ON t2.object_id=ck.parent_object_id WHERE t2.schema_id=s.schema_id) AS CheckConstraintCount,
 (SELECT COUNT(*) FROM sys.check_constraints ck JOIN sys.tables t2 ON t2.object_id=ck.parent_object_id WHERE t2.schema_id=s.schema_id AND (ck.is_disabled=1 OR ck.is_not_trusted=1)) AS DisabledOrUntrustedCheckCount
FROM sys.schemas s
LEFT JOIN sys.tables t ON t.schema_id=s.schema_id AND t.is_ms_shipped=0
WHERE s.name IN (N'core',N'dbo')
GROUP BY s.schema_id,s.name
ORDER BY s.name;

-- Disabled/untrusted parent-child integrity (do not auto-repair; report for review).
SELECT OBJECT_SCHEMA_NAME(fk.parent_object_id) AS SchemaName,
       OBJECT_NAME(fk.parent_object_id) AS TableName,
       fk.name AS ForeignKeyName, fk.is_disabled AS IsDisabled, fk.is_not_trusted AS IsNotTrusted
FROM sys.foreign_keys fk
WHERE fk.is_disabled=1 OR fk.is_not_trusted=1
ORDER BY SchemaName,TableName,ForeignKeyName;

SELECT OBJECT_SCHEMA_NAME(c.parent_object_id) AS SchemaName,
       OBJECT_NAME(c.parent_object_id) AS TableName,
       c.name AS CheckName, c.is_disabled AS IsDisabled, c.is_not_trusted AS IsNotTrusted
FROM sys.check_constraints c
WHERE c.is_disabled=1 OR c.is_not_trusted=1
ORDER BY SchemaName,TableName,CheckName;

-- Index inventory: evidence for query-plan review, not automatic recommendations.
SELECT OBJECT_SCHEMA_NAME(i.object_id) AS SchemaName,
       OBJECT_NAME(i.object_id) AS TableName,
       i.name AS IndexName,
       i.type_desc AS IndexType,
       i.is_unique AS IsUnique,
       i.is_primary_key AS IsPrimaryKey,
       i.is_disabled AS IsDisabled,
       i.has_filter AS HasFilter,
       i.filter_definition AS FilterDefinition
FROM sys.indexes i
JOIN sys.tables t ON t.object_id=i.object_id
WHERE t.is_ms_shipped=0 AND i.index_id>0 AND i.is_hypothetical=0
ORDER BY SchemaName,TableName,i.index_id;

-- A heap is not automatically wrong: inspect write/read plan workload before adding a clustered index.
SELECT SCHEMA_NAME(t.schema_id) AS SchemaName,t.name AS HeapTable
FROM sys.tables t
WHERE t.is_ms_shipped=0 AND EXISTS (
 SELECT 1 FROM sys.indexes i WHERE i.object_id=t.object_id AND i.index_id=0
)
ORDER BY SchemaName,HeapTable;
