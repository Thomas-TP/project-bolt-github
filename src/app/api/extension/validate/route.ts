import { NextRequest, NextResponse } from 'next/server';
import { ExtensionTokenService } from '../../../services/extensionTokenService';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token requis' },
        { status: 400 }
      );
    }

    const result = await ExtensionTokenService.validateToken(token);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        user: result.user,
        tokenInfo: result.tokenInfo
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error('Erreur validation token extension:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
