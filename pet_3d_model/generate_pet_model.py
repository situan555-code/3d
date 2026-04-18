"""
Pet to 3D Model - Direct Generation Script
Uses Gemini Deep Think to create 3D printable model specifications
"""
from google import genai
from google.genai.types import GenerateContentConfig
import sys
sys.path.append('/Users/nautis/Documents/Gemini Interactions')
from config import API_KEY

def generate_3d_pet_model():
    """Generate a 3D printable French Bulldog model using Deep Think."""
    
    client = genai.Client(api_key=API_KEY)
    
    prompt = """I need you to create a detailed 3D printable model of a French Bulldog based on the provided image.

The French Bulldog has these characteristics:
- Large bat-like ears standing upright
- Compact, muscular body with short legs
- Flat, wrinkled face with a short muzzle
- Broad chest and sturdy build
- Proportions typical of the breed

Please provide:

1. **3D Model Specifications:**
   - Create a mesh design that captures the distinctive French Bulldog features
   - Optimize for FDM/FFF 3D printing
   - Target dimensions: approximately 100mm tall x 80mm long (scalable)
   - Ensure 2mm minimum wall thickness throughout
   - Design with no overhangs exceeding 45 degrees
   - Ensure watertight, manifold geometry

2. **Technical Output:**
   - Provide vertex coordinates and face definitions for the 3D mesh
   - Include normal vectors for proper surface rendering
   - Define the model in a format that can be converted to STL/OBJ
   - Specify any required supports or multi-part printing strategy

3. **Print Settings Recommendations:**
   - Layer height
   - Infill percentage
   - Support structure needs
   - Recommended materials (PLA, PETG, etc.)
   - Estimated print time for standard settings

4. **STL File Generation:**
   If possible, provide the complete STL file content or the mathematical representation needed to generate one.

Please think deeply about the 3D geometry needed to accurately represent this breed while maintaining printability."""

    print("🤖 Initiating Deep Think 3D model generation...")
    print("📊 This may take a moment as the AI analyzes the geometry...\n")
    
    try:
        response = client.models.generate_content(
            model="gemini-3-pro-preview",
            contents=prompt,
            config=GenerateContentConfig(
                temperature=1.0,
                top_p=0.95,
                max_output_tokens=8192,
                response_modalities=["TEXT"],
            )
        )
        
        # Save the response
        output_file = "/Users/nautis/Documents/Configure/pet_3d_model/model_specifications.md"
        with open(output_file, 'w') as f:
            f.write("# French Bulldog 3D Model - Deep Think Analysis\n\n")
            f.write(response.text)
        
        print(f"✅ Model specifications saved to: {output_file}\n")
        print("="*80)
        print(response.text)
        print("="*80)
        
        return response
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    generate_3d_pet_model()
