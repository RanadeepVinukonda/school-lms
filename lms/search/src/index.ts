import express from 'express';
import cors from 'cors';
import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// Initialize Elasticsearch client
const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const client = new Client({ node: esNode });

// Ensure Elasticsearch connection and setup indexes
async function setupIndexes() {
  try {
    const ping = await client.ping();
    console.log('Connected to Elasticsearch:', ping);
    
    // Create main indexes if they don't exist
    const indexes = ['textbooks', 'concepts', 'courses'];
    for (const idx of indexes) {
      const exists = await client.indices.exists({ index: idx });
      if (!exists) {
        await client.indices.create({ index: idx });
        console.log(`Created index: ${idx}`);
      }
    }
  } catch (error) {
    console.error('Elasticsearch connection failed or indices setup failed:', error);
  }
}

setupIndexes();

// Endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', esNode });
});

// Index document
app.post('/index', async (req, res) => {
  const { index, id, document } = req.body;
  try {
    const result = await client.index({
      index,
      id,
      document,
      refresh: 'wait_for'
    });
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete document
app.delete('/index/:indexName/:id', async (req, res) => {
  const { indexName, id } = req.params;
  try {
    const result = await client.delete({
      index: indexName,
      id,
      refresh: 'wait_for'
    });
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search all or filtered indexes
app.get('/search', async (req, res) => {
  const { q, schoolId } = req.query;
  if (!q) {
    return res.status(400).json({ success: false, error: 'Query parameter q is required' });
  }

  try {
    // Multi-index search
    const response = await client.search({
      index: 'textbooks,concepts,courses',
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: String(q),
                fields: ['title^3', 'name^3', 'subject^2', 'description', 'summary'],
                fuzziness: 'AUTO'
              }
            }
          ],
          filter: schoolId ? [
            {
              term: {
                'school_id.keyword': String(schoolId)
              }
            }
          ] : []
        }
      }
    });

    // Group hits by index type
    const hits = response.hits.hits;
    const grouped: Record<string, any[]> = {
      textbooks: [],
      concepts: [],
      courses: []
    };

    hits.forEach((hit) => {
      const idx = hit._index;
      if (grouped[idx]) {
        grouped[idx].push({
          id: hit._id,
          score: hit._score,
          ...(hit._source as any)
        });
      }
    });

    res.json({
      success: true,
      data: grouped
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Search service listening on port ${port}`);
});
