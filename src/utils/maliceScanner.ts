import { supabase } from './supabase';
import { emailJSService } from '../services/emailJSService';
import { securityService } from '../services/securityService';

interface ScanResult {
  success: boolean;
  clean: boolean;
  threats: string[];
  error?: string;
  scanId?: string;
}

interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
}

export const maliceScanner = {
  /**
   * Scans a file for malware
   * @param file The file to scan
   * @returns Scan result with threat information
   */
  async scanFile(file: File): Promise<ScanResult> {
    try {
      console.log(`🔍 Scanning file: ${file.name} (${file.size} bytes, ${file.type})`);
      
      // Convert file to base64 for analysis
      const base64 = await fileToBase64(file);
      
      // Create a scan ID for tracking
      const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // First check for EICAR test virus signature - this is critical
      const isEicar = await checkForEicarSignature(file);
      if (isEicar) {
        console.warn(`⚠️ EICAR test virus detected in file: ${file.name}`);
        const result: ScanResult = {
          success: true,
          clean: false,
          threats: ['EICAR-Test-Signature (Test Virus)'],
          scanId
        };
        
        // Store scan result in database for audit trail
        await storeScanResult(file, result);
        
        // Send direct email notification for virus detection
        await sendSecurityNotification(file, result);
        
        return result;
      }
      
      // Check for other malicious patterns
      const maliciousPatterns = await checkForMaliciousPatterns(file);
      if (maliciousPatterns.detected) {
        console.warn(`⚠️ Malicious patterns detected in file: ${file.name}`, maliciousPatterns.patterns);
        const result: ScanResult = {
          success: true,
          clean: false,
          threats: maliciousPatterns.patterns,
          scanId
        };
        
        // Store scan result in database
        await storeScanResult(file, result);
        
        // Send direct email notification for virus detection
        await sendSecurityNotification(file, result);
        
        return result;
      }
      
      // For demonstration, we'll simulate a scan result
      // In production, you would call an actual malware scanning API
      const result = await simulateMalwareScan(file, base64, scanId);
      
      // Log scan results
      if (result.clean) {
        console.log(`✅ File scan complete: ${file.name} - No threats detected`);
      } else {
        console.error(`⚠️ File scan detected threats: ${file.name}`, result.threats);
        
        // Send direct email notification for virus detection
        await sendSecurityNotification(file, result);
      }
      
      // Store scan result in database for audit trail
      await storeScanResult(file, result);
      
      return result;
    } catch (error) {
      console.error('❌ Error scanning file:', error);
      return {
        success: false,
        clean: false,
        threats: [],
        error: error instanceof Error ? error.message : 'Unknown error during scan'
      };
    }
  },
  
  /**
   * Checks if a file is safe based on extension and size
   * This is a basic check before the full scan
   */
  isFileSafe(file: File): SafetyCheckResult {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { safe: false, reason: 'File exceeds maximum size of 10MB' };
    }
    
    // Check file extension against known dangerous types
    const fileName = file.name.toLowerCase();
    const dangerousExtensions = [
      '.exe', '.dll', '.bat', '.cmd', '.msi', '.ps1', '.vbs', '.js', 
      '.jar', '.sh', '.py', '.php', '.pl', '.rb', '.com', '.scr', '.pif'
    ];
    
    for (const ext of dangerousExtensions) {
      if (fileName.endsWith(ext)) {
        return { 
          safe: false, 
          reason: `File type ${ext} is not allowed for security reasons` 
        };
      }
    }
    
    // Check MIME type
    const safeMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-rar-compressed'
    ];
    
    if (!safeMimeTypes.includes(file.type) && file.type !== '') {
      return { 
        safe: false, 
        reason: `File type ${file.type || 'unknown'} is not allowed` 
      };
    }
    
    return { safe: true };
  },
  
  /**
   * Gets scan history for a specific file or all files
   */
  async getScanHistory(fileId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('malware_scans')
        .select('*')
        .order('scanned_at', { ascending: false });
        
      if (fileId) {
        query = query.eq('file_id', fileId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching scan history:', error);
      return [];
    }
  }
};

/**
 * Converts a file to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Reads a file as text
 */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string || '');
    };
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

/**
 * Checks if a file contains the EICAR test virus signature
 * The EICAR test file is a standard test file used to verify antivirus software
 */
async function checkForEicarSignature(file: File): Promise<boolean> {
  try {
    // EICAR signature (standard test virus signature)
    const eicarSignature = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    
    // Read file content as text
    const content = await readFileAsText(file);
    
    // Check if the file contains the EICAR signature
    // We use includes() to catch even if there's extra content around the signature
    return content.includes(eicarSignature);
  } catch (error) {
    console.error('Error checking for EICAR signature:', error);
    // If we can't check, assume it's not EICAR
    return false;
  }
}

/**
 * Checks for various malicious patterns in files
 */
async function checkForMaliciousPatterns(file: File): Promise<{detected: boolean, patterns: string[]}> {
  try {
    const fileName = file.name.toLowerCase();
    const fileType = file.type;
    const detectedPatterns: string[] = [];
    
    // Check filename for suspicious patterns
    const suspiciousNamePatterns = [
      'virus', 'malware', 'trojan', 'worm', 'ransomware', 'hack', 
      'crack', 'keygen', 'patch', 'eicar'
    ];
    
    for (const pattern of suspiciousNamePatterns) {
      if (fileName.includes(pattern)) {
        detectedPatterns.push(`Suspicious filename pattern: ${pattern}`);
      }
    }
    
    // For text files, check content for suspicious patterns
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      const content = await readFileAsText(file);
      
      // Check for script tags or executable code
      if (content.includes('<script>') || 
          content.includes('eval(') || 
          content.includes('function()') ||
          content.includes('powershell') ||
          content.includes('cmd.exe') ||
          content.includes('rundll32')) {
        detectedPatterns.push('Suspicious code detected in text file');
      }
      
      // Check for base64 encoded executable content
      if (content.includes('TVqQAAMAAAAEAAAA') || // PE file header in base64
          content.includes('UEsDBBQAA')) {        // PK file header in base64
        detectedPatterns.push('Possible encoded executable content');
      }
    }
    
    // For PDF files, check for potentially malicious content
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const content = await readFileAsText(file);
      
      if (content.includes('/JS') || 
          content.includes('/JavaScript') || 
          content.includes('/AA') ||
          content.includes('/OpenAction') ||
          content.includes('/Launch')) {
        detectedPatterns.push('Potentially malicious PDF with embedded code');
      }
    }
    
    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  } catch (error) {
    console.error('Error checking for malicious patterns:', error);
    return { detected: false, patterns: [] };
  }
}

/**
 * Simulates a malware scan for demonstration purposes
 * In production, this would be replaced with a call to a real malware scanning API
 */
async function simulateMalwareScan(file: File, base64: string, scanId: string): Promise<ScanResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get file extension
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  // Check for EICAR test file (common antivirus test file)
  if (file.name.toLowerCase().includes('eicar') || file.name.toLowerCase().includes('test-virus')) {
    return {
      success: true,
      clean: false,
      threats: ['EICAR-Test-Signature (Test Virus)'],
      scanId
    };
  }
  
  // Simulate detection for certain file patterns (for demo purposes only)
  const isMalicious = 
    // Simulated malware detection based on filename patterns
    file.name.toLowerCase().includes('malware') ||
    file.name.toLowerCase().includes('virus') ||
    file.name.toLowerCase().includes('trojan') ||
    // Simulated detection based on file size patterns (specific sizes that might be suspicious)
    file.size === 1337 || 
    file.size === 666666;
  
  // For PDF files, simulate deeper content scanning
  const isPdf = extension === 'pdf' || file.type === 'application/pdf';
  const hasSuspiciousPatterns = isPdf && base64.includes('JavaScript') && base64.includes('OpenAction');
  
  if (isMalicious || hasSuspiciousPatterns) {
    return {
      success: true,
      clean: false,
      threats: [
        isMalicious ? 'Suspicious filename pattern detected' : '',
        hasSuspiciousPatterns ? 'Potentially malicious PDF content detected' : '',
        file.size === 1337 ? 'Suspicious file size pattern' : ''
      ].filter(Boolean),
      scanId
    };
  }
  
  return {
    success: true,
    clean: true,
    threats: [],
    scanId
  };
}

/**
 * Stores scan result in the database for audit trail
 */
async function storeScanResult(file: File, result: ScanResult): Promise<void> {
  try {
    // Check if the malware_scans table exists
    const { error: tableCheckError } = await supabase
      .from('malware_scans')
      .select('id')
      .limit(1);
    
    // If table doesn't exist, we'll skip storage but not fail
    if (tableCheckError) {
      console.log('Malware scans table not available, skipping result storage');
      return;
    }
    
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user, skipping scan result storage');
      return;
    }
    
    // Store the scan result
    const { error } = await supabase
      .from('malware_scans')
      .insert({
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        scan_id: result.scanId,
        is_clean: result.clean,
        threats: result.threats.length > 0 ? result.threats : null,
        scanned_by: user.id,
        scanned_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error storing scan result:', error);
    } else {
      console.log('✅ Scan result stored successfully');
    }
  } catch (error) {
    console.error('Error in storeScanResult:', error);
  }
}

/**
 * Sends a direct security notification email
 */
async function sendSecurityNotification(file: File, result: ScanResult): Promise<void> {
  try {
    console.log('🚨 Sending security notification for malware detection');
    
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return;
    }
    
    // Get user details
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    
    // Format threats list
    const threatsText = result.threats.join(', ');
    
    // Use the securityService to send the notification
    await securityService.sendSecurityNotification(
      '🚨 ALERTE SÉCURITÉ: Virus détecté dans un fichier',
      'Un fichier malveillant a été détecté et bloqué',
      {
        'Fichier': file.name,
        'Type': file.type || 'Non spécifié',
        'Taille': `${(file.size / 1024).toFixed(2)} KB`,
        'Menaces': threatsText,
        'Utilisateur': userData?.full_name || userData?.email || user.email || 'Inconnu',
        'Date': new Date().toLocaleString(),
        'ID de scan': result.scanId || 'Non spécifié'
      }
    );
    
  } catch (error) {
    console.error('Error sending security notification:', error);
  }
}