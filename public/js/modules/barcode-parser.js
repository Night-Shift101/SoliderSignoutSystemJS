/**
 * Barcode Parser for Military ID Cards
 * Parses 2D barcode data from CAC (Common Access Card) to extract soldier information
 */

class BarcodeParser {
    /**
     * Base32/Base36 character set (includes 0-9 for mixed alphanumeric encoding)
     */
    static BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    static BASE36_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    /**
     * Decode 7-character mixed alphanumeric string to DOD ID using base 32
     * @param {string} encodedString - 7-character encoded string (0-9, A-Z)
     * @returns {string|null} Decoded DOD ID or null if invalid
     */
    static decodeBase32ToDODID(encodedString) {
        try {
            if (!encodedString || typeof encodedString !== 'string') {
                return null;
            }

            const cleanInput = encodedString.toUpperCase().trim();
            
            if (cleanInput.length !== 7) {
                return null; // Must be exactly 7 characters
            }

            // Use base 32 with mixed alphanumeric character mapping
            // This maps 0-9,A-Z to values 0-31 (but only uses first 32 values)
            let result = 0;
            const base = 32;
            
            for (let i = 0; i < cleanInput.length; i++) {
                const char = cleanInput[i];
                let value;
                
                if (char >= '0' && char <= '9') {
                    value = parseInt(char);
                } else if (char >= 'A' && char <= 'Z') {
                    value = char.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
                } else {
                    return null; // Invalid character
                }
                
                // Ensure we don't exceed base 32
                if (value >= base) {
                    return null;
                }
                
                result = result * base + value;
            }
            
            const dodId = result.toString();
            
            // Validate it's a reasonable DOD ID (should be numeric and reasonable length)
            if (/^\d+$/.test(dodId) && dodId.length >= 7 && dodId.length <= 12) {
                return dodId;
            }

            return null;
        } catch (error) {
            console.error('Error decoding base32:', error);
            return null;
        }
    }

    /**
     * Parse soldier information from 2D barcode scan data
     * @param {string} barcodeData - Raw barcode scan data
     * @returns {Object} Parsed soldier information or null if parsing fails
     */
    static parseSoldierInfo(barcodeData) {
        try {
            if (!barcodeData || typeof barcodeData !== 'string') {
                throw new Error('Invalid barcode data');
            }

            // Clean the input data
            const cleanData = barcodeData.trim();
            
            // Split into lines - CAC data typically comes in 2 lines
            const lines = cleanData.split('\n').map(line => line.trim());
            
            if (lines.length < 2) {
                throw new Error('Insufficient barcode data - expected at least 2 lines');
            }

            const line1 = lines[0];
            const line2 = lines[1];

            // Parse first line - contains name information
            // Format appears to be: [prefix]FirstName[spaces]MiddleI LastName[spaces][suffix]
            const nameMatch = line1.match(/([A-Z][a-z]+)\s+([A-Z])([A-Z][a-z]+)\s+([A-Z])/);
            
            let firstName, middleInitial, lastName;
            
            if (nameMatch) {
                firstName = nameMatch[1];
                middleInitial = nameMatch[2];
                lastName = nameMatch[3];
            } else {
                // Alternative parsing method - look for capitalized words
                const words = line1.split(/\s+/).filter(word => word.length > 0);
                const nameWords = words.filter(word => /^[A-Z][a-z]+$/.test(word));
                
                if (nameWords.length >= 2) {
                    firstName = nameWords[0];
                    lastName = nameWords[1];
                    
                    // Look for single letter (middle initial)
                    const singleLetters = line1.match(/\s([A-Z])\s/g);
                    if (singleLetters && singleLetters.length > 0) {
                        middleInitial = singleLetters[0].trim();
                    }
                }
            }

            // Parse second line - contains rank and other info
            // Format appears to be: [numbers/chars][rank][other data]
            let rank = null;
            
            // Look for common military ranks first
            const commonRanks = ['PVT', 'PFC', 'SPC', 'CPL', 'SGT', 'SSG', 'SFC', 'MSG', 'SGM', 'CSM',
                               '2LT', '1LT', 'CPT', 'MAJ', 'LTC', 'COL', 'BG', 'MG', 'LTG', 'GEN'];
            
            for (const possibleRank of commonRanks) {
                if (line2.includes(possibleRank)) {
                    rank = possibleRank;
                    break;
                }
            }
            
            // If no common rank found, try pattern matching
            if (!rank) {
                const rankMatch = line2.match(/([A-Z]{2,4})\s+/);
                if (rankMatch) {
                    rank = rankMatch[1];
                }
            }

            // Extract DOD ID - look for base32 encoded data in first line after "M"
            let dodId = null;
            
            // Look for DOD ID in the first line starting at position 2 (after "M")
            if (line1.length > 8) {
                const dodIdCandidate = line1.substring(1, 8); // Extract 7 characters starting at position 1 (after M)
                const decoded = this.decodeBase32ToDODID(dodIdCandidate);
                if (decoded) {
                    dodId = decoded;
                }
            }
            
            // Fallback: look for base32 encoded DOD ID in second line if not found in first line
            if (!dodId) {
                const base32Match = line2.match(/([A-Z2-7]{10,20})/g);
                if (base32Match) {
                    // Try to decode each potential base32 string
                    for (const candidate of base32Match) {
                        const decoded = this.decodeBase32ToDODID(candidate);
                        if (decoded) {
                            dodId = decoded;
                            break;
                        }
                    }
                }
            }
            
            // Final fallback: look for direct 10-digit number if base32 decoding failed
            if (!dodId) {
                const dodIdMatch = cleanData.match(/(\d{10})/);
                if (dodIdMatch) {
                    dodId = dodIdMatch[1];
                }
            }

            // Validate that we got the essential information
            if (!firstName || !lastName) {
                throw new Error('Could not parse first name and last name from barcode data');
            }

            return {
                firstName: firstName,
                middleInitial: middleInitial || '',
                lastName: lastName,
                rank: rank || 'UNK',
                dodId: dodId || '',
                fullName: `${firstName} ${middleInitial ? middleInitial + ' ' : ''}${lastName}`,
                rawData: barcodeData
            };

        } catch (error) {
            console.error('Error parsing barcode data:', error);
            return null;
        }
    }

    /**
     * Validate parsed soldier information
     * @param {Object} soldierInfo - Parsed soldier information
     * @returns {boolean} True if valid, false otherwise
     */
    static validateSoldierInfo(soldierInfo) {
        if (!soldierInfo) return false;
        
        return (
            soldierInfo.firstName && 
            soldierInfo.lastName && 
            soldierInfo.firstName.length > 0 && 
            soldierInfo.lastName.length > 0
        );
    }

    /**
     * Format soldier information for display
     * @param {Object} soldierInfo - Parsed soldier information
     * @returns {string} Formatted display string
     */
    static formatSoldierInfo(soldierInfo) {
        if (!soldierInfo) return 'Invalid soldier information';
        
        const rank = soldierInfo.rank !== 'UNK' ? soldierInfo.rank + ' ' : '';
        const middle = soldierInfo.middleInitial ? soldierInfo.middleInitial + ' ' : '';
        
        return `${rank}${soldierInfo.firstName} ${middle}${soldierInfo.lastName}`;
    }
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BarcodeParser;
}

// Make available in browser environment
if (typeof window !== 'undefined') {
    window.BarcodeParser = BarcodeParser;
}

// Export for use in both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BarcodeParser;
} else if (typeof window !== 'undefined') {
    window.BarcodeParser = BarcodeParser;
}
