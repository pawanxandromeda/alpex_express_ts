-- Create stored procedure for dynamic PPIC filtering
-- This procedure handles complex filtering, sorting, and pagination

CREATE OR REPLACE FUNCTION filter_ppic_dynamic(
  p_filters JSONB,
  p_sort_by TEXT DEFAULT 'createdAt',
  p_sort_order TEXT DEFAULT 'DESC',
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 50,
  p_operator TEXT DEFAULT 'AND'
)
RETURNS TABLE(
  total_count BIGINT,
  page_number INTEGER,
  page_size INTEGER,
  total_pages INTEGER,
  data JSON
) AS $$
DECLARE
  v_offset INTEGER;
  v_total_count BIGINT;
  v_total_pages INTEGER;
  v_sql TEXT;
  v_where_clause TEXT := '';
  v_filter_key TEXT;
  v_filter_value JSONB;
  v_operator TEXT;
  v_conditions TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_limit;

  -- Build WHERE clause from filters if provided
  IF p_filters IS NOT NULL AND p_filters::TEXT != '{}' THEN
    FOR v_filter_key IN SELECT jsonb_object_keys(p_filters)
    LOOP
      v_filter_value := p_filters -> v_filter_key;
      v_operator := v_filter_value ->> 'operator';

      -- Build filter condition based on operator
      -- NOTE: Column names must be quoted with double quotes to preserve camelCase
      IF v_operator IN ('equals', 'eq', '=') THEN
        v_conditions := array_append(v_conditions, 
          '"' || v_filter_key || '"::TEXT = ''' || COALESCE(v_filter_value ->> 'value', '') || '''');
      ELSIF v_operator IN ('not_equals', 'neq', '!=') THEN
        v_conditions := array_append(v_conditions, 
          '"' || v_filter_key || '"::TEXT != ''' || COALESCE(v_filter_value ->> 'value', '') || '''');
      ELSIF v_operator IN ('contains', 'like') THEN
        v_conditions := array_append(v_conditions, 
          '"' || v_filter_key || '"::TEXT ILIKE ''%' || COALESCE(v_filter_value ->> 'value', '') || '%''');
      ELSIF v_operator IN ('starts_with', 'starts') THEN
        v_conditions := array_append(v_conditions, 
          '"' || v_filter_key || '"::TEXT ILIKE ''' || COALESCE(v_filter_value ->> 'value', '') || '%''');
      ELSIF v_operator IN ('ends_with', 'ends') THEN
        v_conditions := array_append(v_conditions, 
          '"' || v_filter_key || '"::TEXT ILIKE ''%' || COALESCE(v_filter_value ->> 'value', '') || '''');
      ELSIF v_operator IN ('gt', '>') THEN
        v_conditions := array_append(v_conditions, 
          '"' || v_filter_key || '"::NUMERIC > ' || COALESCE(v_filter_value ->> 'value', '0'));
      ELSIF v_operator IN ('gte', '>=') THEN
        v_conditions := array_append(v_conditions, 
          '"' || v_filter_key || '"::NUMERIC >= ' || COALESCE(v_filter_value ->> 'value', '0'));
      ELSIF v_operator IN ('lt', '<') THEN
        v_conditions := array_append(v_conditions, 
          '"' || v_filter_key || '"::NUMERIC < ' || COALESCE(v_filter_value ->> 'value', '0'));
      ELSIF v_operator IN ('lte', '<=') THEN
        v_conditions := array_append(v_conditions, 
          '"' || v_filter_key || '"::NUMERIC <= ' || COALESCE(v_filter_value ->> 'value', '0'));
      ELSIF v_operator IN ('between', 'range') THEN
        v_conditions := array_append(v_conditions, 
          '"' || v_filter_key || '"::NUMERIC BETWEEN ' || COALESCE(v_filter_value ->> 'min', '0') || 
          ' AND ' || COALESCE(v_filter_value ->> 'max', '999999999'));
      ELSIF v_operator IN ('date_range') THEN
        v_conditions := array_append(v_conditions, 
          '"' || v_filter_key || '"::DATE BETWEEN ''' || COALESCE(v_filter_value ->> 'from', '1900-01-01') || 
          '''::DATE AND ''' || COALESCE(v_filter_value ->> 'to', now()::DATE::TEXT) || '''::DATE');
      ELSIF v_operator IN ('is_null', 'null') THEN
        v_conditions := array_append(v_conditions, '"' || v_filter_key || '" IS NULL');
      ELSIF v_operator IN ('is_not_null', 'not_null') THEN
        v_conditions := array_append(v_conditions, '"' || v_filter_key || '" IS NOT NULL');
      ELSIF v_operator IN ('in') THEN
        v_conditions := array_append(v_conditions, 
          '"' || v_filter_key || '"::TEXT IN (' || 
          (SELECT string_agg('''' || value ->> 0 || '''', ', ') FROM jsonb_array_elements(v_filter_value -> 'values') AS value) || ')');
      ELSIF v_operator IN ('not_in') THEN
        v_conditions := array_append(v_conditions, 
          '"' || v_filter_key || '"::TEXT NOT IN (' || 
          (SELECT string_agg('''' || value ->> 0 || '''', ', ') FROM jsonb_array_elements(v_filter_value -> 'values') AS value) || ')');
      END IF;
    END LOOP;

    -- Combine conditions with AND/OR
    IF array_length(v_conditions, 1) > 0 THEN
      v_where_clause := ' WHERE ' || array_to_string(v_conditions, ' ' || COALESCE(p_operator, 'AND') || ' ');
    END IF;
  END IF;

  -- Get total count
  EXECUTE 'SELECT COUNT(*) FROM "PurchaseOrder"' || v_where_clause INTO v_total_count;
  v_total_pages := CEIL(v_total_count::NUMERIC / p_limit);

  -- Build and execute main query with properly quoted column names
  v_sql := 'SELECT json_agg(row_to_json(t)) FROM (
    SELECT * FROM "PurchaseOrder"' || 
    v_where_clause || 
    ' ORDER BY "' || COALESCE(p_sort_by, 'createdAt') || '" ' || COALESCE(p_sort_order, 'DESC') || 
    ' LIMIT ' || p_limit || ' OFFSET ' || v_offset || 
    ') t';

  -- Return results
  RETURN QUERY 
  EXECUTE 'SELECT ' || 
    v_total_count::TEXT || '::BIGINT as total_count, ' ||
    p_page::TEXT || '::INTEGER as page_number, ' ||
    p_limit::TEXT || '::INTEGER as page_size, ' ||
    v_total_pages::TEXT || '::INTEGER as total_pages, ' ||
    '(' || v_sql || ')::JSON as data';
END;
$$ LANGUAGE plpgsql;
