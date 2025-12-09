# Talkinpon\Talkinpon\DialogFlow\views.py

from django.shortcuts import render
from django.shortcuts import render
from .dialogflow_service import detect_intent_texts

# Create your views here.

def chat_interface(request):
    user_query = ""
    dialogflow_response = "Escribe una pregunta para comenzar."
    extracted_parameters = {}
    
    # Usar el session_key de Django como ID de sesión de Dialogflow
    # Esto es crucial para mantener el contexto conversacional
    session_id = request.session.session_key 
    if not session_id:
        request.session.create()
        session_id = request.session.session_key

    if request.method == 'POST':
        print("TIPO DE REQUEST.POST:", type(request.POST))
        user_query = request.POST.get('user_input', '').strip()
        
        if user_query:
            # Llamar a la función y obtener el diccionario completo
                result = detect_intent_texts(session_id, user_query)
                
                # Separar los resultados para el contexto
                dialogflow_response = result['response_text']
                extracted_parameters = result['parameters']
        else:
            dialogflow_response = "Por favor, ingresa una consulta válida."

    context = {
        'current_query': user_query,
        'final_response': dialogflow_response, 
        'extracted_params': extracted_parameters,
    }
    
    # La respuesta final es la cadena de texto limpia extraída del JSON de Dialogflow
    return render(request, 'chat.html', context)
