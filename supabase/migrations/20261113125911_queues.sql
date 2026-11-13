create extension if not exists pgmq;
select pgmq.create('memory_ingest');
