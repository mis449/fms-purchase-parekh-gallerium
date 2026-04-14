import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkData() {
  console.log('Checking INDENT-PO table...')
  const { data, error } = await supabase
    .from('INDENT-PO')
    .select('*')
    .limit(5)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Sample Rows (first 5):')
    data.forEach((row, i) => {
      console.log(`Row ${i + 1}:`, {
        id: row.id,
        'RL No.': row['RL No.'],
        'Firm Name': row['Firm Name'],
        'Planned2': row['Planned2'],
        'Actual1': row['Actual1'],
        'Actual2': row['Actual2']
      })
    })
  }
}

checkData()
