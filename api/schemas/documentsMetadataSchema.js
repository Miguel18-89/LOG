const { z } = require('zod');

exports.documentMetadataSchema = z.object({
  uploaded_by: z.string().uuid(),
  store_id: z.string().uuid(),
});