import { Document, YAMLMap } from 'yaml';
import z from 'zod';

/**
 * 递归将 JSON Schema 对象节点转换为带有注释的 YAML 节点
 */
function jsonSchemaToYamlNode(schema: z.core.JSONSchema._JSONSchema, doc: Document) {
  if (!schema || typeof schema !== 'object') return doc.createNode(schema);

  if (schema.type === 'object' && schema.properties) {
    const mapNode = doc.createNode({});

    for (const [key, subSchema] of Object.entries(schema.properties)) {
      const childNode = jsonSchemaToYamlNode(subSchema, doc);

      const keyNode = doc.createNode(key);

      if ((subSchema as any).description && childNode) {
        keyNode.commentBefore = ` ${(subSchema as any).description}`;
      }
      (mapNode as YAMLMap).set(keyNode, childNode);
    }
    return mapNode;
  }

  if (schema.default) {
    return doc.createNode(schema.default);
  }

  return null;
}

export function zodToYaml(schema: z.ZodTypeAny): string {
  const jsonSchema = z.toJSONSchema(schema);
  const doc = new Document();
  const rootNode = jsonSchemaToYamlNode(jsonSchema, doc);

  if (jsonSchema.description && rootNode) {
    rootNode.commentBefore = ` ${jsonSchema.description}`;
  }

  doc.contents = rootNode;

  return doc.toString();
}
